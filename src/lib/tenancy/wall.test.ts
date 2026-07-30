import "dotenv/config";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AccessLevel } from "@/lib/tenancy/badge";

/**
 * THE WALL TESTS.
 *
 * These are the tests Step 3 exists for, and they are written to **fail if the wall is
 * fake**. They deliberately bypass the application completely: no Prisma, no page, no
 * route protection. They open a raw connection as `gestionale_app` — the same restricted
 * account the running system uses — set a badge, and then ask the database directly for
 * rows they must not be allowed to have.
 *
 * If Row-Level Security were misconfigured, or the application were still connecting as a
 * superuser, every one of these would return data and fail loudly.
 *
 * They need the demo data: run `npm run db:seed` first.
 */

// Fixed in prisma/seed.ts so the tests can name them.
const SEREGNO = "11111111-1111-1111-1111-111111111111";
const NORD = "22222222-2222-2222-2222-222222222222";
const SEREGNO_GYM = "aaaaaaaa-0000-0000-0000-000000000001";
const MONZA = "bbbbbbbb-0000-0000-0000-000000000001";
const COMO = "bbbbbbbb-0000-0000-0000-000000000002";

let client: pg.Client;
/** A privileged connection, used ONLY to prove the hidden rows genuinely exist. */
let control: pg.Client;
const people = new Map<string, string>();

async function personId(email: string): Promise<string> {
  const cached = people.get(email);
  if (cached) {
    return cached;
  }
  const { rows } = await client.query(
    "SELECT id FROM app.auth_find_person_by_email($1)",
    [email],
  );
  if (rows.length === 0) {
    throw new Error(`Demo data missing: ${email}. Run \`npm run db:seed\`.`);
  }
  people.set(email, rows[0].id);
  return rows[0].id;
}

type Badge = {
  level: AccessLevel;
  companyId?: string | null;
  gymId?: string | null;
  personId?: string | null;
};

/** Runs a query carrying a badge, then rolls back so nothing is left behind. */
async function asBadge<T>(
  badge: Badge | null,
  work: () => Promise<T>,
): Promise<T> {
  await client.query("BEGIN");
  try {
    if (badge !== null) {
      await client.query(
        `SELECT set_config('app.access_level', $1, true),
                set_config('app.company_id',   $2, true),
                set_config('app.gym_id',       $3, true),
                set_config('app.person_id',    $4, true)`,
        [
          badge.level,
          badge.companyId ?? "",
          badge.gymId ?? "",
          badge.personId ?? "",
        ],
      );
    }
    return await work();
  } finally {
    await client.query("ROLLBACK");
  }
}

async function count(sql: string, params: unknown[] = []): Promise<number> {
  const { rows } = await client.query(sql, params);
  return rows.length;
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

/**
 * The control.
 *
 * Every test below asserts that something returns *nothing* — and a test like that would
 * pass just as happily against an empty database. These check, through the privileged
 * account, that the rows being hidden genuinely exist. Without this block the whole file
 * could be green and prove absolutely nothing.
 */
describe("the rows really are there — otherwise nothing below means anything", () => {
  it("has both companies, three gyms and the demo people", async () => {
    const companies = await control.query("SELECT id FROM dim_company");
    const gyms = await control.query("SELECT id FROM dim_gym");
    const memberships = await control.query("SELECT id FROM bridge_membership");

    expect(
      companies.rows.length,
      "no demo data — run `npm run db:seed` before these tests",
    ).toBeGreaterThanOrEqual(2);
    expect(gyms.rows.length).toBeGreaterThanOrEqual(3);
    expect(memberships.rows.length).toBeGreaterThanOrEqual(8);
  });

  it("has the very rows the wall tests will fail to see", async () => {
    // Each of these is something a restricted badge is asked for below and must not get.
    const como = await control.query("SELECT id FROM dim_gym WHERE id = $1", [COMO]);
    const nord = await control.query("SELECT id FROM dim_company WHERE id = $1", [NORD]);
    const other = await control.query(
      "SELECT id FROM dim_person WHERE email = 'cliente2@example.com'",
    );

    expect(como.rows).toHaveLength(1);
    expect(nord.rows).toHaveLength(1);
    expect(other.rows).toHaveLength(1);
  });
});

describe("(e) the account the application actually uses", () => {
  it("is not a superuser and cannot bypass Row-Level Security", async () => {
    const { rows } = await client.query(
      `SELECT rolsuper, rolbypassrls, current_user AS who
       FROM pg_roles WHERE rolname = current_user`,
    );

    expect(rows[0].who).not.toBe("postgres");
    expect(rows[0].rolsuper, "the application is a SUPERUSER — every policy below is decorative").toBe(false);
    expect(rows[0].rolbypassrls, "the application can BYPASS RLS — every policy below is decorative").toBe(false);
  });

  it("owns none of the tables it queries, so it cannot switch the policies off", async () => {
    const { rows } = await client.query(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public' AND tableowner = current_user`,
    );
    expect(rows).toEqual([]);
  });

  it("has Row-Level Security enabled AND forced on every tenant table", async () => {
    const { rows } = await client.query(
      `SELECT relname, relrowsecurity, relforcerowsecurity
       FROM pg_class
       WHERE relname IN ('dim_company','dim_gym','bridge_membership','dim_person',
                         'person_role','password_reset_token')`,
    );

    expect(rows).toHaveLength(6);
    for (const table of rows) {
      expect(table.relrowsecurity, `${table.relname} has RLS disabled`).toBe(true);
      expect(table.relforcerowsecurity, `${table.relname} does not FORCE RLS`).toBe(true);
    }
  });
});

describe("(d) no badge at all", () => {
  it.each([
    ["dim_company", "SELECT * FROM dim_company"],
    ["dim_gym", "SELECT * FROM dim_gym"],
    ["bridge_membership", "SELECT * FROM bridge_membership"],
    ["dim_person", "SELECT * FROM dim_person"],
    ["person_role", "SELECT * FROM person_role"],
  ])("returns nothing at all from %s", async (_table, sql) => {
    const found = await asBadge(null, () => count(sql));
    expect(found).toBe(0);
  });

  it("means a forgotten badge fails empty rather than leaking", async () => {
    // The whole safety argument rests on this: code that forgets to set a badge gets
    // no rows, not everybody's rows.
    const found = await asBadge(null, () =>
      count("SELECT * FROM dim_company WHERE id = $1", [SEREGNO]),
    );
    expect(found).toBe(0);
  });
});

describe("(a) a company badge reaching for another company", () => {
  it("cannot see the other company", async () => {
    const found = await asBadge(
      { level: "COMPANY", companyId: SEREGNO, personId: await personId("titolare@example.com") },
      () => count("SELECT * FROM dim_company WHERE id = $1", [NORD]),
    );
    expect(found).toBe(0);
  });

  it("cannot see the other company's gyms, even naming them directly", async () => {
    const found = await asBadge(
      { level: "COMPANY", companyId: SEREGNO, personId: await personId("titolare@example.com") },
      () => count("SELECT * FROM dim_gym WHERE id = ANY($1)", [[MONZA, COMO]]),
    );
    expect(found).toBe(0);
  });

  it("cannot see the other company's memberships", async () => {
    const found = await asBadge(
      { level: "COMPANY", companyId: SEREGNO, personId: await personId("titolare@example.com") },
      () => count("SELECT * FROM bridge_membership WHERE company_id = $1", [NORD]),
    );
    expect(found).toBe(0);
  });

  it("cannot see people who belong only to the other company", async () => {
    const outsider = await personId("nord@example.com");
    const found = await asBadge(
      { level: "COMPANY", companyId: SEREGNO, personId: await personId("titolare@example.com") },
      () => count("SELECT * FROM dim_person WHERE id = $1", [outsider]),
    );
    expect(found).toBe(0);
  });

  it("still sees its own company perfectly well — the wall is not simply blocking everything", async () => {
    const found = await asBadge(
      { level: "COMPANY", companyId: SEREGNO, personId: await personId("titolare@example.com") },
      () => count("SELECT * FROM dim_company WHERE id = $1", [SEREGNO]),
    );
    expect(found).toBe(1);
  });
});

describe("(b) a gym-level badge and its sibling gyms", () => {
  it("cannot read a sibling gym of the SAME company", async () => {
    const found = await asBadge(
      {
        level: "GYM",
        companyId: NORD,
        gymId: MONZA,
        personId: await personId("monza@example.com"),
      },
      () => count("SELECT * FROM dim_gym WHERE id = $1", [COMO]),
    );
    expect(found).toBe(0);
  });

  it("sees its own gym, and only its own", async () => {
    const rows = await asBadge(
      {
        level: "GYM",
        companyId: NORD,
        gymId: MONZA,
        personId: await personId("monza@example.com"),
      },
      async () => (await client.query("SELECT id FROM dim_gym")).rows,
    );
    expect(rows.map((row) => row.id)).toEqual([MONZA]);
  });

  it("is genuinely narrower than the company owner above it", async () => {
    // The same company, seen by its circuit owner: both gyms.
    const asCompany = await asBadge(
      { level: "COMPANY", companyId: NORD, personId: await personId("nord@example.com") },
      () => count("SELECT * FROM dim_gym"),
    );
    expect(asCompany).toBe(2);
  });
});

describe("(c) a client badge and other clients", () => {
  it("cannot read another client's rows at the same gym", async () => {
    const other = await personId("cliente2@example.com");
    const found = await asBadge(
      {
        level: "CLIENT",
        companyId: SEREGNO,
        gymId: SEREGNO_GYM,
        personId: await personId("cliente@example.com"),
      },
      () => count("SELECT * FROM dim_person WHERE id = $1", [other]),
    );
    expect(found).toBe(0);
  });

  it("cannot read another client's membership", async () => {
    const other = await personId("cliente2@example.com");
    const found = await asBadge(
      {
        level: "CLIENT",
        companyId: SEREGNO,
        gymId: SEREGNO_GYM,
        personId: await personId("cliente@example.com"),
      },
      () => count("SELECT * FROM bridge_membership WHERE person_id = $1", [other]),
    );
    expect(found).toBe(0);
  });

  it("cannot list the gym's other people by asking for all of them", async () => {
    const me = await personId("cliente@example.com");
    const rows = await asBadge(
      { level: "CLIENT", companyId: SEREGNO, gymId: SEREGNO_GYM, personId: me },
      async () => (await client.query("SELECT id FROM dim_person")).rows,
    );
    expect(rows.map((row) => row.id)).toEqual([me]);
  });

  it("can still see itself", async () => {
    const me = await personId("cliente@example.com");
    const found = await asBadge(
      { level: "CLIENT", companyId: SEREGNO, gymId: SEREGNO_GYM, personId: me },
      () => count("SELECT * FROM dim_person WHERE id = $1", [me]),
    );
    expect(found).toBe(1);
  });

  it("cannot read anybody's platform roles but its own", async () => {
    const me = await personId("cliente@example.com");
    const admin = await personId("admin@example.com");
    const found = await asBadge(
      { level: "CLIENT", companyId: SEREGNO, gymId: SEREGNO_GYM, personId: me },
      () => count("SELECT * FROM person_role WHERE person_id = $1", [admin]),
    );
    expect(found).toBe(0);
  });
});

describe("the platform badge", () => {
  it("sees every company, which is what the founders are for", async () => {
    const found = await asBadge(
      { level: "PLATFORM", personId: await personId("admin@example.com") },
      () => count("SELECT * FROM dim_company"),
    );
    expect(found).toBeGreaterThanOrEqual(2);
  });

  it("sees every gym across all companies", async () => {
    const found = await asBadge(
      { level: "PLATFORM", personId: await personId("admin@example.com") },
      () => count("SELECT * FROM dim_gym"),
    );
    expect(found).toBeGreaterThanOrEqual(3);
  });
});

describe("a badge that claims more than it should", () => {
  it("gains nothing by naming a company the person does not belong to", async () => {
    // The badge is set by the server from the session, never by the browser. Even so:
    // if a client-level badge were somehow pointed at another company, the level still
    // confines it to its own rows, and its own rows are not in that company.
    const me = await personId("cliente@example.com");
    const found = await asBadge(
      { level: "CLIENT", companyId: NORD, gymId: MONZA, personId: me },
      () => count("SELECT * FROM bridge_membership"),
    );
    expect(found).toBe(0);
  });

  it("is refused the password reset table outright, under every badge", async () => {
    // Stronger than returning no rows: the application was granted nothing at all on
    // this table, so PostgreSQL refuses before Row-Level Security is even consulted.
    // Reset tokens are reachable only through the `app.auth_*` functions.
    const admin = await personId("admin@example.com");

    for (const level of ["PLATFORM", "COMPANY", "GYM", "WORKER", "CLIENT"] as const) {
      await expect(
        asBadge({ level, companyId: SEREGNO, gymId: SEREGNO_GYM, personId: admin }, () =>
          count("SELECT * FROM password_reset_token"),
        ),
        `${level} was not refused outright`,
      ).rejects.toThrow(/permission denied/i);
    }
  });

  it("is refused the password reset table with no badge either", async () => {
    await expect(
      asBadge(null, () => count("SELECT * FROM password_reset_token")),
    ).rejects.toThrow(/permission denied/i);
  });
});
