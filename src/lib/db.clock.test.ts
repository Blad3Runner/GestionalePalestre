import "dotenv/config";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * ONE CLOCK, AND IT IS THE DATABASE'S.
 *
 * This file exists because of a real bug found on 2026-07-30: every timestamp written
 * from the application landed **two hours adrift** — exactly the local UTC offset —
 * while everything PostgreSQL wrote itself was correct. Two rows created in the same
 * transaction disagreed about when "now" was.
 *
 * That is not cosmetic. Credits expire twelve months from purchase, cancelling is free
 * until exactly 24 hours before a session, and the frequency discount depends on which
 * Monday–Sunday week a session falls in. A two-hour error in any of those is money.
 *
 * The fix was to take the clock away from the application entirely. These tests fail if
 * anybody ever hands it back.
 */

let db: pg.Client;

/** How far apart two timestamps may be before something is wrong. */
const TOLERANCE_MS = 60_000;

beforeAll(async () => {
  db = new pg.Client({ connectionString: process.env.DATABASE_MIGRATION_URL });
  await db.connect();
});

afterAll(async () => {
  await db?.end();
});

describe("every timestamp column is filled by the database", () => {
  it("has a default on every created/updated/occurred column", async () => {
    const { rows } = await db.query(`
      SELECT table_name, column_name, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type LIKE 'timestamp%'
        AND column_name IN ('created_at','updated_at','occurred_at','changed_at',
                            'joined_at','granted_at','valid_from')
      ORDER BY table_name, column_name
    `);

    expect(rows.length).toBeGreaterThan(0);
    for (const column of rows) {
      expect(
        column.column_default,
        `${column.table_name}.${column.column_name} has no database default, so the application would set it`,
      ).not.toBeNull();
    }
  });

  it("keeps updated_at on a trigger rather than trusting the application", async () => {
    const { rows } = await db.query(
      `SELECT tgname FROM pg_trigger WHERE tgname LIKE 'touch_%' AND NOT tgisinternal`,
    );
    expect(rows.map((row) => row.tgname).sort()).toEqual([
      "touch_company",
      "touch_deactivated_at",
      "touch_gym",
      "touch_membership",
      "touch_person",
    ]);
  });

  it("derives the deactivation date, so the application cannot set it at all", async () => {
    await db.query("BEGIN");
    try {
      const trainer = await db.query(
        `SELECT id FROM bridge_membership WHERE role = 'TRAINER' AND is_active LIMIT 1`,
      );
      if (trainer.rows.length === 0) {
        throw new Error("No demo data. Run `npm run db:seed` first.");
      }

      // A deliberately absurd date, of exactly the kind a confused application would
      // send. The trigger must overwrite it rather than store it.
      const lie = await db.query(
        `UPDATE bridge_membership
         SET is_active = false, deactivated_at = '1999-01-01T00:00:00Z'
         WHERE id = $1
         RETURNING deactivated_at, (SELECT now()) AS db_now`,
        [trainer.rows[0].id],
      );

      const stored = lie.rows[0].deactivated_at.getTime();
      const dbNow = lie.rows[0].db_now.getTime();

      expect(
        Math.abs(stored - dbNow),
        "the application's date was stored instead of the database's",
      ).toBeLessThan(TOLERANCE_MS);

      // And switching them back on clears it, rather than leaving a stale date behind.
      const back = await db.query(
        `UPDATE bridge_membership SET is_active = true WHERE id = $1
         RETURNING deactivated_at`,
        [trainer.rows[0].id],
      );
      expect(back.rows[0].deactivated_at).toBeNull();
    } finally {
      await db.query("ROLLBACK");
    }
  });
});

describe("the timestamps actually written", () => {
  it("agree with the database clock, not with the application's timezone", async () => {
    await db.query("BEGIN");
    try {
      const company = await db.query(
        `INSERT INTO dim_company (id, name, updated_at)
         VALUES (gen_random_uuid(), 'Clock Test', DEFAULT)
         RETURNING created_at, updated_at`,
      );
      const { rows } = await db.query("SELECT now() AS db_now");

      const dbNow = rows[0].db_now.getTime();
      const created = company.rows[0].created_at.getTime();

      // Two hours would be the bug. A minute of slack is generous.
      expect(
        Math.abs(dbNow - created),
        "a stored timestamp disagrees with the database clock",
      ).toBeLessThan(TOLERANCE_MS);
    } finally {
      await db.query("ROLLBACK");
    }
  });

  it("agree with each other across tables written in one transaction", async () => {
    await db.query("BEGIN");
    try {
      // This is exactly the shape that exposed the bug: one row whose timestamp came
      // from the database, another from a trigger, in a single transaction.
      const membership = await db.query(`
        SELECT m.id, m.company_id, m.gym_id FROM bridge_membership m
        WHERE m.role = 'MEMBER' LIMIT 1
      `);
      if (membership.rows.length === 0) {
        throw new Error("No demo data. Run `npm run db:seed` first.");
      }
      const row = membership.rows[0];

      const event = await db.query(
        `INSERT INTO fact_lifecycle_event (id, membership_id, company_id, gym_id, to_state)
         VALUES (gen_random_uuid(), $1, $2, $3, 'CLIENT')
         RETURNING occurred_at`,
        [row.id, row.company_id, row.gym_id],
      );

      const audit = await db.query(
        `SELECT changed_at FROM audit_log
         WHERE table_name = 'fact_lifecycle_event'
         ORDER BY changed_at DESC LIMIT 1`,
      );

      const occurred = event.rows[0].occurred_at.getTime();
      const changed = audit.rows[0].changed_at.getTime();

      expect(
        Math.abs(occurred - changed),
        "two rows from the same transaction disagree about when now was",
      ).toBeLessThan(TOLERANCE_MS);
    } finally {
      await db.query("ROLLBACK");
    }
  });

  it("moves updated_at forward on a change, without the application setting it", async () => {
    await db.query("BEGIN");
    try {
      const created = await db.query(
        `INSERT INTO dim_company (id, name, updated_at)
         VALUES (gen_random_uuid(), 'Touch Test', DEFAULT)
         RETURNING id, updated_at`,
      );

      const updated = await db.query(
        `UPDATE dim_company SET name = 'Touched' WHERE id = $1 RETURNING updated_at`,
        [created.rows[0].id],
      );

      expect(updated.rows[0].updated_at.getTime()).toBeGreaterThanOrEqual(
        created.rows[0].updated_at.getTime(),
      );
    } finally {
      await db.query("ROLLBACK");
    }
  });
});
