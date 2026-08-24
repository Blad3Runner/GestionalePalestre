import "dotenv/config";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The audit trail, and the walls around Step 4's new tables.
 *
 * Like the wall tests, these bypass the application entirely and connect as the
 * restricted account. Everything happens inside a transaction that is rolled back, so
 * the demo data is left exactly as it was found.
 *
 * Needs the demo data: run `npm run db:seed` first.
 */

const CORPO_LIBERO = "11111111-1111-1111-1111-111111111111";
const MILANO = "aaaaaaaa-0000-0000-0000-000000000001";

let client: pg.Client;
let control: pg.Client;

async function personId(email: string): Promise<string> {
  const { rows } = await client.query(
    "SELECT id FROM app.auth_find_person_by_email($1)",
    [email],
  );
  if (rows.length === 0) {
    throw new Error(`Demo data missing: ${email}. Run \`npm run db:seed\`.`);
  }
  return rows[0].id;
}

type Badge = {
  level: string;
  companyId?: string | null;
  gymId?: string | null;
  personId?: string | null;
};

async function asBadge<T>(badge: Badge, work: () => Promise<T>): Promise<T> {
  await client.query("BEGIN");
  try {
    await client.query(
      `SELECT set_config('app.access_level', $1, true),
              set_config('app.company_id',   $2, true),
              set_config('app.gym_id',       $3, true),
              set_config('app.person_id',    $4, true)`,
      [badge.level, badge.companyId ?? "", badge.gymId ?? "", badge.personId ?? ""],
    );
    return await work();
  } finally {
    await client.query("ROLLBACK");
  }
}

beforeAll(async () => {
  client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  control = new pg.Client({ connectionString: process.env.DATABASE_MIGRATION_URL });
  await control.connect();
});

afterAll(async () => {
  await client?.end();
  await control?.end();
});

// ---------------------------------------------------------------------------

describe("the audit trail writes itself", () => {
  it("records a change nobody asked it to record", async () => {
    const owner = await personId("titolare@example.com");

    const entry = await asBadge(
      { level: "COMPANY", companyId: CORPO_LIBERO, personId: owner },
      async () => {
        // A perfectly ordinary update. Nothing here mentions the audit log.
        await client.query(
          `UPDATE bridge_membership SET level = 'Avanzato'
           WHERE role = 'MEMBER' AND company_id = $1`,
          [CORPO_LIBERO],
        );

        const { rows } = await client.query(
          `SELECT table_name, action, changed_by_id, before, after
           FROM audit_log
           WHERE table_name = 'bridge_membership'
           ORDER BY changed_at DESC LIMIT 1`,
        );
        return rows[0];
      },
    );

    expect(entry).toBeDefined();
    expect(entry.action).toBe("UPDATE");
    expect(entry.table_name).toBe("bridge_membership");
    expect(entry.after.level).toBe("Avanzato");
  });

  it("knows who did it, without being told", async () => {
    const owner = await personId("titolare@example.com");

    const changedBy = await asBadge(
      { level: "COMPANY", companyId: CORPO_LIBERO, personId: owner },
      async () => {
        await client.query(
          `UPDATE bridge_membership SET level = 'Base'
           WHERE role = 'MEMBER' AND company_id = $1`,
          [CORPO_LIBERO],
        );
        const { rows } = await client.query(
          `SELECT changed_by_id FROM audit_log
           WHERE table_name = 'bridge_membership'
           ORDER BY changed_at DESC LIMIT 1`,
        );
        return rows[0].changed_by_id;
      },
    );

    // Taken from the badge the transaction was already carrying for Row-Level Security.
    expect(changedBy).toBe(owner);
  });

  it("keeps the before and the after, so a change can be read both ways", async () => {
    const owner = await personId("titolare@example.com");

    const entry = await asBadge(
      { level: "COMPANY", companyId: CORPO_LIBERO, personId: owner },
      async () => {
        await client.query(
          `UPDATE bridge_membership SET lifecycle_state = 'DORMANT'
           WHERE role = 'MEMBER' AND company_id = $1 AND lifecycle_state = 'CLIENT'`,
          [CORPO_LIBERO],
        );
        const { rows } = await client.query(
          `SELECT before, after FROM audit_log
           WHERE table_name = 'bridge_membership'
           ORDER BY changed_at DESC LIMIT 1`,
        );
        return rows[0];
      },
    );

    expect(entry.before.lifecycle_state).toBe("CLIENT");
    expect(entry.after.lifecycle_state).toBe("DORMANT");
  });

  it("never copies a password hash into the trail, where it would outlive the password", async () => {
    const member = await personId("cliente@example.com");

    // Committed on purpose, and undone at the end. The audit row has no company, so a
    // company badge cannot read it, and reading it from inside a rolled-back
    // transaction on another connection would see nothing at all — which is how an
    // earlier version of this test came to pass on leftover rows from previous runs
    // rather than on anything it had just done.
    const before = await control.query(
      "SELECT phone FROM dim_person WHERE id = $1",
      [member],
    );

    try {
      await control.query("UPDATE dim_person SET phone = '+39 000' WHERE id = $1", [
        member,
      ]);

      const { rows } = await control.query(
        `SELECT before, after FROM audit_log
         WHERE table_name = 'dim_person' AND row_id = $1 AND action = 'UPDATE'
         ORDER BY changed_at DESC LIMIT 1`,
        [member],
      );

      expect(rows[0], "the update wrote no audit entry at all").toBeDefined();
      expect(rows[0].after.phone).toBe("+39 000");
      expect(Object.keys(rows[0].after)).not.toContain("password_hash");
      expect(Object.keys(rows[0].before)).not.toContain("password_hash");
      expect(JSON.stringify(rows[0])).not.toContain("$2b$");
    } finally {
      await control.query("UPDATE dim_person SET phone = $2 WHERE id = $1", [
        member,
        before.rows[0].phone,
      ]);
    }
  });

  it("strips the password hash from every entry it has ever written", async () => {
    // The test above proves one update. This proves the rule held for all of them,
    // including the inserts the seed made.
    const { rows } = await control.query(
      `SELECT count(*)::int AS leaked FROM audit_log
       WHERE before ? 'password_hash' OR after ? 'password_hash'`,
    );
    const total = await control.query(
      `SELECT count(*)::int AS n FROM audit_log WHERE table_name = 'dim_person'`,
    );

    expect(total.rows[0].n, "no person entries at all — nothing was checked").toBeGreaterThan(0);
    expect(rows[0].leaked).toBe(0);
  });
});

describe("the application cannot tamper with the trail", () => {
  it("is refused when it tries to write an entry itself", async () => {
    const owner = await personId("titolare@example.com");

    await expect(
      asBadge({ level: "COMPANY", companyId: CORPO_LIBERO, personId: owner }, () =>
        client.query(
          `INSERT INTO audit_log (table_name, action) VALUES ('forged', 'INSERT')`,
        ),
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("is refused when it tries to erase one", async () => {
    const owner = await personId("titolare@example.com");

    await expect(
      asBadge({ level: "COMPANY", companyId: CORPO_LIBERO, personId: owner }, () =>
        client.query("DELETE FROM audit_log"),
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("is refused when it tries to rewrite one", async () => {
    const owner = await personId("titolare@example.com");

    await expect(
      asBadge({ level: "COMPANY", companyId: CORPO_LIBERO, personId: owner }, () =>
        // Must fit the column, or the length check fires first and this would pass
        // without ever reaching the permission check.
        client.query("UPDATE audit_log SET action = 'FORGED'"),
      ),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe("what a trainer is paid is financial data", () => {
  it("exists, so the tests below are not passing against nothing", async () => {
    const { rows } = await control.query(
      "SELECT id FROM dim_trainer_compensation WHERE company_id = $1",
      [CORPO_LIBERO],
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it("is visible to the owner of the company", async () => {
    const owner = await personId("titolare@example.com");
    const found = await asBadge(
      { level: "COMPANY", companyId: CORPO_LIBERO, personId: owner },
      async () =>
        (await client.query("SELECT * FROM dim_trainer_compensation")).rows.length,
    );
    expect(found).toBeGreaterThan(0);
  });

  it("is invisible to a worker — including a trainer looking for their own", async () => {
    const trainer = await personId("trainer@example.com");
    const found = await asBadge(
      {
        level: "WORKER",
        companyId: CORPO_LIBERO,
        gymId: MILANO,
        personId: trainer,
      },
      async () =>
        (await client.query("SELECT * FROM dim_trainer_compensation")).rows.length,
    );
    expect(found).toBe(0);
  });

  it("is invisible to a client", async () => {
    const member = await personId("cliente@example.com");
    const found = await asBadge(
      { level: "CLIENT", companyId: CORPO_LIBERO, gymId: MILANO, personId: member },
      async () =>
        (await client.query("SELECT * FROM dim_trainer_compensation")).rows.length,
    );
    expect(found).toBe(0);
  });
});

describe("a member's own history", () => {
  it("is visible to them", async () => {
    const member = await personId("cliente@example.com");
    const found = await asBadge(
      { level: "CLIENT", companyId: CORPO_LIBERO, gymId: MILANO, personId: member },
      async () =>
        (await client.query("SELECT * FROM fact_lifecycle_event")).rows.length,
    );
    expect(found).toBeGreaterThan(0);
  });

  it("does not include anybody else's", async () => {
    const member = await personId("cliente@example.com");
    const otherMembership = await control.query(
      `SELECT m.id FROM bridge_membership m
       JOIN dim_person p ON p.id = m.person_id
       WHERE p.email = 'cliente2@example.com'`,
    );

    const found = await asBadge(
      { level: "CLIENT", companyId: CORPO_LIBERO, gymId: MILANO, personId: member },
      async () =>
        (
          await client.query(
            "SELECT * FROM fact_lifecycle_event WHERE membership_id = $1",
            [otherMembership.rows[0].id],
          )
        ).rows.length,
    );
    expect(found).toBe(0);
  });

  it("is visible to the front desk of their gym, which is what a desk is for", async () => {
    const staff = await personId("reception@example.com");
    const found = await asBadge(
      { level: "WORKER", companyId: CORPO_LIBERO, gymId: MILANO, personId: staff },
      async () =>
        (await client.query("SELECT * FROM fact_lifecycle_event")).rows.length,
    );
    expect(found).toBeGreaterThan(0);
  });
});

describe("person_role really has shrunk to platform admin", () => {
  it("holds nothing else", async () => {
    const { rows } = await control.query(
      "SELECT DISTINCT role FROM person_role",
    );
    expect(rows.map((row) => row.role)).toEqual(["PLATFORM_ADMIN"]);
  });

  it("refuses to accept anything else, permanently", async () => {
    const someone = await personId("cliente@example.com");
    await expect(
      control.query(
        `INSERT INTO person_role (id, person_id, role) VALUES (gen_random_uuid(), $1, 'TRAINER')`,
        [someone],
      ),
    ).rejects.toThrow(/person_role_is_platform_only|violates check constraint/i);
  });
});

describe("the audit trail cannot be lost by accident later", () => {
  /**
   * Three tables are exempt, each for a stated reason. Everything else that holds
   * business data must carry an audit trigger — including tables that do not exist yet.
   *
   * This is the test that keeps "audited from here onward" true. Step 5 adds services,
   * prices and packs; Step 6 adds the ledger. If any of them arrives without a trigger,
   * this fails immediately rather than being discovered a year later when somebody asks
   * who changed a price.
   */
  const EXEMPT = new Set([
    // The trail itself. Auditing the audit would recurse forever.
    "audit_log",
    // Reachable only through the auth functions; the application has no privileges on
    // it at all, and it holds nothing but expiring hashes.
    "password_reset_token",
    // Prisma's own bookkeeping, not business data.
    "_prisma_migrations",
  ]);

  it("has a trigger on every table that holds business data", async () => {
    const { rows } = await control.query(`
      SELECT t.tablename,
             EXISTS (
               SELECT 1 FROM pg_trigger g
               JOIN pg_class c ON c.oid = g.tgrelid
               WHERE c.relname = t.tablename
                 AND NOT g.tgisinternal
                 AND g.tgname LIKE 'audit_%'
             ) AS audited
      FROM pg_tables t
      WHERE t.schemaname = 'public'
      ORDER BY t.tablename
    `);

    const unaudited = rows
      .filter((row) => !EXEMPT.has(row.tablename) && !row.audited)
      .map((row) => row.tablename);

    expect(
      unaudited,
      `these tables hold business data with no audit trail: ${unaudited.join(", ")}. ` +
        "Add an `audit_<table>` trigger, or add the table to EXEMPT with the reason.",
    ).toEqual([]);
  });

  it("is not passing vacuously against a database with no tables", async () => {
    const { rows } = await control.query(
      `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'`,
    );
    expect(rows[0].n).toBeGreaterThanOrEqual(9);
  });

  it("still records a deletion, which is when a trail matters most", async () => {
    const owner = await personId("titolare@example.com");

    await control.query("BEGIN");
    try {
      const gym = await control.query(
        `INSERT INTO dim_gym (id, company_id, name) VALUES (gen_random_uuid(), $1, 'Da cancellare')
         RETURNING id`,
        [CORPO_LIBERO],
      );
      await control.query(
        `SELECT set_config('app.person_id', $1, true)`,
        [owner],
      );
      await control.query("DELETE FROM dim_gym WHERE id = $1", [gym.rows[0].id]);

      const { rows } = await control.query(
        `SELECT action, before FROM audit_log
         WHERE table_name = 'dim_gym' AND row_id = $1 AND action = 'DELETE'`,
        [gym.rows[0].id],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].before.name).toBe("Da cancellare");
    } finally {
      await control.query("ROLLBACK");
    }
  });
});
