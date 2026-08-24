import "dotenv/config";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * THE SANDBOX'S PROMISES.
 *
 * The owner's acceptance script (docs/acceptance/) tells him to sign in as named people
 * and expect particular things to be true. Those expectations are fixtures, and fixtures
 * rot: somebody edits the seed, and a script that used to work starts lying.
 *
 * This file is what stops that. Every fact the acceptance script leans on is asserted
 * here, so a seed that quietly stops providing it fails the build instead of wasting the
 * owner's afternoon.
 *
 * Needs the demo data: `npm run db:seed`, or `npm run db:reset-demo` to start clean.
 */

let db: pg.Client;

beforeAll(async () => {
  db = new pg.Client({ connectionString: process.env.DATABASE_MIGRATION_URL });
  await db.connect();
});

afterAll(async () => {
  await db?.end();
});

async function one<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T> {
  const { rows } = await db.query(sql, params);
  if (rows.length === 0) {
    throw new Error(`Demo data missing. Run \`npm run db:reset-demo\`.\n${sql}`);
  }
  return rows[0] as T;
}

describe("the two companies have deliberately different shapes", () => {
  it("has a single-gym studio that sells credits", async () => {
    const company = await one<{ name: string; settings: { businessModel?: string }; gyms: number }>(`
      SELECT c.name, c.settings, count(g.id)::int AS gyms
      FROM dim_company c LEFT JOIN dim_gym g ON g.company_id = c.id
      WHERE c.name = 'Studio Corpo Libero'
      GROUP BY c.id
    `);

    expect(company.gyms).toBe(1);
    expect(company.settings.businessModel).toBe("CREDITS");
  });

  it("has a two-gym circuit that sells subscriptions", async () => {
    const company = await one<{ name: string; settings: { businessModel?: string }; gyms: number }>(`
      SELECT c.name, c.settings, count(g.id)::int AS gyms
      FROM dim_company c LEFT JOIN dim_gym g ON g.company_id = c.id
      WHERE c.name = 'Circuito Nord'
      GROUP BY c.id
    `);

    expect(company.gyms).toBe(2);
    expect(company.settings.businessModel).toBe("SUBSCRIPTIONS");
  });

  it("gives each company an owner, a front desk and two trainers", async () => {
    const { rows } = await db.query(`
      SELECT c.name AS company, m.role, count(*)::int AS n
      FROM bridge_membership m JOIN dim_company c ON c.id = m.company_id
      WHERE m.role IN ('GYM_OWNER', 'STAFF', 'TRAINER')
      GROUP BY c.name, m.role
    `);

    const count = (company: string, role: string) =>
      rows.find((row) => row.company === company && row.role === role)?.n ?? 0;

    for (const company of ["Studio Corpo Libero", "Circuito Nord"]) {
      expect(count(company, "GYM_OWNER"), `${company} has no owner`).toBeGreaterThanOrEqual(1);
      expect(count(company, "STAFF"), `${company} has no front desk`).toBeGreaterThanOrEqual(1);
      expect(count(company, "TRAINER"), `${company} needs two trainers`).toBeGreaterThanOrEqual(2);
    }
  });

  it("leaves exactly one trainer deactivated in each, so history can be checked", async () => {
    const { rows } = await db.query(`
      SELECT c.name AS company, count(*)::int AS n
      FROM bridge_membership m JOIN dim_company c ON c.id = m.company_id
      WHERE m.role = 'TRAINER' AND NOT m.is_active
      GROUP BY c.name ORDER BY c.name
    `);

    expect(rows.map((row) => [row.company, row.n])).toEqual([
      ["Circuito Nord", 1],
      ["Studio Corpo Libero", 1],
    ]);
  });
});

describe("the person with two hats", () => {
  it("is one human being, not two accounts", async () => {
    const { rows } = await db.query(
      "SELECT id FROM dim_person WHERE email = 'duecappelli@example.com'",
    );
    expect(rows).toHaveLength(1);
  });

  it("is a trainer at one company and a member at the other, in the same skin", async () => {
    const { rows } = await db.query(`
      SELECT c.name AS company, m.role, m.lifecycle_state
      FROM bridge_membership m
      JOIN dim_person p ON p.id = m.person_id
      JOIN dim_company c ON c.id = m.company_id
      WHERE p.email = 'duecappelli@example.com'
      ORDER BY c.name
    `);

    expect(rows).toHaveLength(2);
    expect(rows[0].company).toBe("Circuito Nord");
    expect(rows[0].role).toBe("MEMBER");
    expect(rows[0].lifecycle_state).toBe("CLIENT");
    expect(rows[1].company).toBe("Studio Corpo Libero");
    expect(rows[1].role).toBe("TRAINER");
    // A trainer is not a member of the place they work; the state belongs to the
    // membership, not the person.
    expect(rows[1].lifecycle_state).toBeNull();
  });

  it("carries no company on the person row, which is what makes this possible", async () => {
    const { rows } = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'dim_person' AND column_name = 'company_id'
    `);
    expect(rows, "dim_person grew a company_id — the two-hats case is now impossible").toEqual([]);
  });

  it("is paid as a trainer at Corpo Libero and owes nothing as a member at Nord", async () => {
    const { rows } = await db.query(`
      SELECT c.name AS company, tc.model
      FROM dim_trainer_compensation tc
      JOIN bridge_membership m ON m.id = tc.membership_id
      JOIN dim_person p ON p.id = m.person_id
      JOIN dim_company c ON c.id = tc.company_id
      WHERE p.email = 'duecappelli@example.com'
    `);

    expect(rows).toHaveLength(1);
    expect(rows[0].company).toBe("Studio Corpo Libero");
  });
});

describe("how trainers are paid", () => {
  it("has all three models in use, so none of them is untried", async () => {
    // Sorted here rather than in SQL: PostgreSQL orders an enum by the order it was
    // declared in, not alphabetically, which makes the expectation below misleading.
    const { rows } = await db.query(
      "SELECT DISTINCT model FROM dim_trainer_compensation",
    );
    expect(rows.map((row) => row.model).sort()).toEqual([
      "OWNER_DRAW",
      "PER_SESSION",
      "REVENUE_SHARE",
    ]);
  });

  it("puts revenue share on the senior trainers, per session on the juniors", async () => {
    const senior = await one(`
      SELECT tc.model, tc.amount FROM dim_trainer_compensation tc
      JOIN bridge_membership m ON m.id = tc.membership_id
      JOIN dim_person p ON p.id = m.person_id
      WHERE p.email = 'senior@example.com'
    `);
    const junior = await one(`
      SELECT tc.model, tc.amount FROM dim_trainer_compensation tc
      JOIN bridge_membership m ON m.id = tc.membership_id
      JOIN dim_person p ON p.id = m.person_id
      WHERE p.email = 'trainer@example.com'
    `);

    expect(senior.model).toBe("REVENUE_SHARE");
    expect(junior.model).toBe("PER_SESSION");
  });

  it("keeps paying the owner by draw, because he trains in his own studio", async () => {
    const owner = await one(`
      SELECT tc.model FROM dim_trainer_compensation tc
      JOIN bridge_membership m ON m.id = tc.membership_id
      JOIN dim_person p ON p.id = m.person_id
      WHERE p.email = 'titolare@example.com'
    `);
    expect(owner.model).toBe("OWNER_DRAW");
  });

  it("survives a trainer being switched off — the pay record is history, not a setting", async () => {
    const pay = await one(`
      SELECT tc.model, m.is_active FROM dim_trainer_compensation tc
      JOIN bridge_membership m ON m.id = tc.membership_id
      JOIN dim_person p ON p.id = m.person_id
      WHERE p.email = 'senior@example.com'
    `);
    expect(pay.is_active).toBe(false);
    expect(pay.model).toBe("REVENUE_SHARE");
  });
});

describe("the members the acceptance script walks through", () => {
  it("covers every lifecycle state, so each can be seen on a screen", async () => {
    const { rows } = await db.query(`
      SELECT DISTINCT lifecycle_state FROM bridge_membership
      WHERE role = 'MEMBER' AND lifecycle_state IS NOT NULL
      ORDER BY lifecycle_state
    `);
    expect(rows.map((row) => row.lifecycle_state).sort()).toEqual([
      "CHURN",
      "CLIENT",
      "DORMANT",
      "LEAD",
      "STARTER",
    ]);
  });

  it("gives the active trainers members to lose when they are deactivated", async () => {
    const { rows } = await db.query(`
      SELECT count(*)::int AS n FROM bridge_membership
      WHERE role = 'MEMBER' AND default_trainer_id IS NOT NULL
    `);
    expect(rows[0].n).toBeGreaterThan(0);
  });

  it("has a platform admin who belongs to no company at all", async () => {
    const admin = await one(`
      SELECT p.id,
             (SELECT count(*)::int FROM person_role r
              WHERE r.person_id = p.id AND r.role = 'PLATFORM_ADMIN') AS platform,
             (SELECT count(*)::int FROM bridge_membership m WHERE m.person_id = p.id) AS memberships
      FROM dim_person p WHERE p.email = 'admin@example.com'
    `);

    expect(admin.platform).toBe(1);
    expect(
      admin.memberships,
      "the founders belong to no gym — that is what platform level means",
    ).toBe(0);
  });
});

describe("the names cannot be confused with each other", () => {
  /**
   * The first demo world had a company called "Studio Seregno" whose only gym was
   * also called "Seregno". Reading a dropdown, there was no way to tell which word
   * meant the business and which meant the building. Renamed on the owner's
   * instruction (docs/decisions.md, 2026-08-22), and locked here so it cannot drift
   * back.
   */
  it("never gives a company a name that contains one of its cities", async () => {
    const { rows } = await db.query(`
      SELECT c.name AS company, g.name AS gym
      FROM dim_company c JOIN dim_gym g ON g.company_id = c.id
    `);

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(
        row.company.toLowerCase().includes(row.gym.toLowerCase()),
        `company "${row.company}" contains its own gym's name "${row.gym}" — ` +
          "the two read as the same thing on screen",
      ).toBe(false);
    }
  });

  it("gives every gym a distinct name, so a dropdown is never ambiguous", async () => {
    const { rows } = await db.query("SELECT name FROM dim_gym");
    const names = rows.map((row) => row.name);
    expect(new Set(names).size, `duplicate gym names: ${names.join(", ")}`).toBe(names.length);
  });
});
