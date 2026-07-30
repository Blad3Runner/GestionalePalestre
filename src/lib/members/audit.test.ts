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

const SEREGNO = "11111111-1111-1111-1111-111111111111";
const SEREGNO_GYM = "aaaaaaaa-0000-0000-0000-000000000001";

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
      { level: "COMPANY", companyId: SEREGNO, personId: owner },
      async () => {
        // A perfectly ordinary update. Nothing here mentions the audit log.
        await client.query(
          `UPDATE bridge_membership SET level = 'Avanzato'
           WHERE role = 'MEMBER' AND company_id = $1`,
          [SEREGNO],
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
      { level: "COMPANY", companyId: SEREGNO, personId: owner },
      async () => {
        await client.query(
          `UPDATE bridge_membership SET level = 'Base'
           WHERE role = 'MEMBER' AND company_id = $1`,
          [SEREGNO],
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
      { level: "COMPANY", companyId: SEREGNO, personId: owner },
      async () => {
        await client.query(
          `UPDATE bridge_membership SET lifecycle_state = 'DORMANT'
           WHERE role = 'MEMBER' AND company_id = $1 AND lifecycle_state = 'CLIENT'`,
          [SEREGNO],
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
    const owner = await personId("titolare@example.com");
    const member = await personId("cliente@example.com");

    const entry = await asBadge(
      { level: "COMPANY", companyId: SEREGNO, personId: owner },
      async () => {
        await client.query("UPDATE dim_person SET phone = '+39 000' WHERE id = $1", [
          member,
        ]);
        const { rows } = await control.query(
          `SELECT before, after FROM audit_log
           WHERE table_name = 'dim_person' AND row_id = $1
           ORDER BY changed_at DESC LIMIT 1`,
          [member],
        );
        return rows[0];
      },
    );

    // Read through the privileged connection, so this is not merely hidden by a policy.
    expect(entry).toBeDefined();
    expect(Object.keys(entry.after)).not.toContain("password_hash");
    expect(Object.keys(entry.before)).not.toContain("password_hash");
    expect(JSON.stringify(entry)).not.toContain("$2b$");
  });
});

describe("the application cannot tamper with the trail", () => {
  it("is refused when it tries to write an entry itself", async () => {
    const owner = await personId("titolare@example.com");

    await expect(
      asBadge({ level: "COMPANY", companyId: SEREGNO, personId: owner }, () =>
        client.query(
          `INSERT INTO audit_log (table_name, action) VALUES ('forged', 'INSERT')`,
        ),
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("is refused when it tries to erase one", async () => {
    const owner = await personId("titolare@example.com");

    await expect(
      asBadge({ level: "COMPANY", companyId: SEREGNO, personId: owner }, () =>
        client.query("DELETE FROM audit_log"),
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("is refused when it tries to rewrite one", async () => {
    const owner = await personId("titolare@example.com");

    await expect(
      asBadge({ level: "COMPANY", companyId: SEREGNO, personId: owner }, () =>
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
      [SEREGNO],
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it("is visible to the owner of the company", async () => {
    const owner = await personId("titolare@example.com");
    const found = await asBadge(
      { level: "COMPANY", companyId: SEREGNO, personId: owner },
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
        companyId: SEREGNO,
        gymId: SEREGNO_GYM,
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
      { level: "CLIENT", companyId: SEREGNO, gymId: SEREGNO_GYM, personId: member },
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
      { level: "CLIENT", companyId: SEREGNO, gymId: SEREGNO_GYM, personId: member },
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
      { level: "CLIENT", companyId: SEREGNO, gymId: SEREGNO_GYM, personId: member },
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
      { level: "WORKER", companyId: SEREGNO, gymId: SEREGNO_GYM, personId: staff },
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
