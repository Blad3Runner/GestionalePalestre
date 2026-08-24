import "dotenv/config";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * THE THINGS THE OWNER ACTUALLY PRESSES.
 *
 * Everything else in Step 4 was tested at the level of the database or of a pure
 * calculation. This file tests the three actions themselves — adding a member, moving
 * them through the lifecycle, deactivating a trainer — by calling them exactly as a
 * button on a screen does, against the real database, through the restricted account and
 * the badge.
 *
 * It exists because Step 4 was once declared done while these three functions had no
 * test at all. The rulebook was proven; the buttons were not.
 *
 * **These tests build their own company.** They do not touch the demo world, so they can
 * commit real changes — which is the point, since the actions commit — without leaving
 * the sandbox altered or upsetting the tests that read it.
 */

const TEST_COMPANY = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const TEST_GYM = "dddddddd-0000-0000-0000-000000000001";
const OWNER_EMAIL = "owner@actions.test";
const TRAINER_EMAIL = "trainer@actions.test";
const MEMBER_EMAIL = "existing.member@actions.test";

/** Filled in by beforeAll; the session mock reads them when the action asks. */
let ownerId = "";
let trainerMembershipId = "";
let memberMembershipId = "";

const sessionMock = vi.fn();

vi.mock("@/auth", () => ({ auth: () => sessionMock() }));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: `${TEST_COMPANY}:${TEST_GYM}` }) }),
  // The first-password link has to point back at whatever host answered the request.
  headers: async () => new Map([["host", "localhost:3000"]]),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const { createMemberAction, changeLifecycleAction, setTrainerActiveAction } =
  await import("@/lib/members/actions");
const { listMembers, gymsInScope } = await import("@/lib/members/queries");
const { createPersonAction } = await import("@/lib/platform/actions");
const { hashToken } = await import("@/lib/auth/password-reset");

let control: pg.Client;

/** The owner of the test gym, signed in and looking at it. */
function signedInAsOwner() {
  return {
    user: {
      id: ownerId,
      name: "Test Owner",
      email: OWNER_EMAIL,
      roles: [],
      scopes: [
        {
          companyId: TEST_COMPANY,
          companyName: "Actions Test Co",
          gymId: TEST_GYM,
          gymName: "Test Gym",
          role: "GYM_OWNER",
          level: "GYM",
        },
      ],
      locale: "it",
    },
  };
}

async function person(email: string): Promise<string> {
  const { rows } = await control.query("SELECT id FROM dim_person WHERE email = $1", [
    email,
  ]);
  return rows[0]?.id ?? "";
}

beforeAll(async () => {
  control = new pg.Client({ connectionString: process.env.DATABASE_MIGRATION_URL });
  await control.connect();

  await wipeTestCompany();

  await control.query(
    `INSERT INTO dim_company (id, name) VALUES ($1, 'Actions Test Co')`,
    [TEST_COMPANY],
  );
  await control.query(
    `INSERT INTO dim_gym (id, company_id, name, city) VALUES ($1, $2, 'Test Gym', 'Test')`,
    [TEST_GYM, TEST_COMPANY],
  );

  // A bcrypt hash of nothing anybody knows. These accounts are never signed into.
  const unusable = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/HpH5Km1eS";

  for (const [email, name] of [
    [OWNER_EMAIL, "Test Owner"],
    [TRAINER_EMAIL, "Test Trainer"],
    [MEMBER_EMAIL, "Existing Member"],
  ]) {
    await control.query(
      `INSERT INTO dim_person (id, name, email, password_hash)
       VALUES (gen_random_uuid(), $1, $2, $3)`,
      [name, email, unusable],
    );
  }

  ownerId = await person(OWNER_EMAIL);

  await control.query(
    `INSERT INTO bridge_membership (id, person_id, company_id, gym_id, role)
     VALUES (gen_random_uuid(), $1, $2, $3, 'GYM_OWNER')`,
    [ownerId, TEST_COMPANY, TEST_GYM],
  );

  const trainer = await control.query(
    `INSERT INTO bridge_membership (id, person_id, company_id, gym_id, role)
     VALUES (gen_random_uuid(), $1, $2, $3, 'TRAINER') RETURNING id`,
    [await person(TRAINER_EMAIL), TEST_COMPANY, TEST_GYM],
  );
  trainerMembershipId = trainer.rows[0].id;

  // The trainer's pay, so there is history to survive their deactivation.
  await control.query(
    `INSERT INTO dim_trainer_compensation (id, membership_id, company_id, gym_id, model, amount)
     VALUES (gen_random_uuid(), $1, $2, $3, 'REVENUE_SHARE', 45.00)`,
    [trainerMembershipId, TEST_COMPANY, TEST_GYM],
  );

  // A member who already has that trainer as their usual one, so deactivating has
  // something real to release.
  const member = await control.query(
    `INSERT INTO bridge_membership
       (id, person_id, company_id, gym_id, role, lifecycle_state, default_trainer_id)
     VALUES (gen_random_uuid(), $1, $2, $3, 'MEMBER', 'CLIENT', $4) RETURNING id`,
    [await person(MEMBER_EMAIL), TEST_COMPANY, TEST_GYM, trainerMembershipId],
  );
  memberMembershipId = member.rows[0].id;
});

afterAll(async () => {
  await wipeTestCompany();
  await control?.end();
});

beforeEach(() => {
  sessionMock.mockReset();
  sessionMock.mockResolvedValue(signedInAsOwner());
});

/** Removes everything this file created, in an order the links allow. */
async function wipeTestCompany(): Promise<void> {
  await control.query(
    `DELETE FROM fact_lifecycle_event WHERE company_id = $1`,
    [TEST_COMPANY],
  );
  await control.query(
    `DELETE FROM dim_trainer_compensation WHERE company_id = $1`,
    [TEST_COMPANY],
  );
  // Clear the self-reference before deleting, or the rows hold each other up.
  await control.query(
    `UPDATE bridge_membership SET default_trainer_id = NULL WHERE company_id = $1`,
    [TEST_COMPANY],
  );
  await control.query(`DELETE FROM bridge_membership WHERE company_id = $1`, [
    TEST_COMPANY,
  ]);
  await control.query(`DELETE FROM dim_gym WHERE company_id = $1`, [TEST_COMPANY]);
  await control.query(`DELETE FROM dim_company WHERE id = $1`, [TEST_COMPANY]);
  await control.query(
    `DELETE FROM password_reset_token WHERE person_id IN
       (SELECT id FROM dim_person WHERE email LIKE '%@actions.test')`,
  );
  await control.query(`DELETE FROM dim_person WHERE email LIKE '%@actions.test'`);
  await control.query(`DELETE FROM audit_log WHERE company_id = $1`, [TEST_COMPANY]);
}

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}

// ---------------------------------------------------------------------------

describe("adding a member at the desk", () => {
  it("creates the person and the membership together", async () => {
    const result = await createMemberAction(
      { error: null },
      form({ name: "Nuova Persona", email: "nuova@actions.test", phone: "+39 333" }),
    );

    expect(result.error).toBeNull();
    expect(result.createdId).toBeTruthy();

    const { rows } = await control.query(
      `SELECT p.name, p.email, p.phone, m.role, m.company_id, m.gym_id
       FROM bridge_membership m JOIN dim_person p ON p.id = m.person_id
       WHERE m.id = $1`,
      [result.createdId],
    );

    expect(rows[0].name).toBe("Nuova Persona");
    expect(rows[0].email).toBe("nuova@actions.test");
    expect(rows[0].role).toBe("MEMBER");
    expect(rows[0].company_id).toBe(TEST_COMPANY);
    expect(rows[0].gym_id).toBe(TEST_GYM);
  });

  it("starts them as a Lead, with the history to say so", async () => {
    const result = await createMemberAction(
      { error: null },
      form({ name: "Lead Persona", email: "lead@actions.test" }),
    );

    const membership = await control.query(
      "SELECT lifecycle_state FROM bridge_membership WHERE id = $1",
      [result.createdId],
    );
    expect(membership.rows[0].lifecycle_state).toBe("LEAD");

    const history = await control.query(
      `SELECT from_state, to_state, recorded_by_id, occurred_at
       FROM fact_lifecycle_event WHERE membership_id = $1`,
      [result.createdId],
    );
    expect(history.rows).toHaveLength(1);
    expect(history.rows[0].from_state).toBeNull();
    expect(history.rows[0].to_state).toBe("LEAD");
    expect(history.rows[0].recorded_by_id).toBe(ownerId);
    expect(history.rows[0].occurred_at).not.toBeNull();
  });

  it("lower-cases the email, so signing in is not case-sensitive", async () => {
    const result = await createMemberAction(
      { error: null },
      form({ name: "Maiuscole", email: "MAIUSCOLE@Actions.Test" }),
    );

    const { rows } = await control.query(
      `SELECT p.email FROM bridge_membership m JOIN dim_person p ON p.id = m.person_id
       WHERE m.id = $1`,
      [result.createdId],
    );
    expect(rows[0].email).toBe("maiuscole@actions.test");
  });

  it("refuses a blank name or a blank email rather than creating half a person", async () => {
    const noName = await createMemberAction(
      { error: null },
      form({ name: "   ", email: "nameless@actions.test" }),
    );
    expect(noName.error).toBe("missingFields");

    const noEmail = await createMemberAction(
      { error: null },
      form({ name: "Senza Email", email: "" }),
    );
    expect(noEmail.error).toBe("missingFields");

    const { rows } = await control.query(
      `SELECT count(*)::int AS n FROM dim_person
       WHERE email = 'nameless@actions.test' OR name = 'Senza Email'`,
    );
    expect(rows[0].n).toBe(0);
  });

  it("says so plainly when the email already belongs to somebody", async () => {
    await createMemberAction(
      { error: null },
      form({ name: "Primo", email: "doppio@actions.test" }),
    );
    const second = await createMemberAction(
      { error: null },
      form({ name: "Secondo", email: "doppio@actions.test" }),
    );

    expect(second.error).toBe("emailTaken");
  });

  it("is refused outright to somebody who is not signed in", async () => {
    sessionMock.mockResolvedValue(null);

    await expect(
      createMemberAction({ error: null }, form({ name: "X", email: "x@actions.test" })),
    ).rejects.toThrow(/REDIRECT:\/signin/);
  });

  it("writes an audit entry nobody asked it to write", async () => {
    const result = await createMemberAction(
      { error: null },
      form({ name: "Tracciata", email: "tracciata@actions.test" }),
    );

    const { rows } = await control.query(
      `SELECT action, changed_by_id FROM audit_log
       WHERE table_name = 'bridge_membership' AND row_id = $1`,
      [result.createdId],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe("INSERT");
    expect(rows[0].changed_by_id).toBe(ownerId);
  });
});

describe("moving a member through the lifecycle", () => {
  it("takes a Lead to Starter, and records who did it and when", async () => {
    const created = await createMemberAction(
      { error: null },
      form({ name: "Da Lead", email: "dalead@actions.test" }),
    );

    const outcome = await changeLifecycleAction(
      { error: null },
      form({
        membershipId: created.createdId!,
        toState: "STARTER",
        note: "Ha comprato lo Starter Pack",
      }),
    );

    expect(outcome.error).toBeNull();

    const membership = await control.query(
      "SELECT lifecycle_state FROM bridge_membership WHERE id = $1",
      [created.createdId],
    );
    expect(membership.rows[0].lifecycle_state).toBe("STARTER");

    const history = await control.query(
      `SELECT from_state, to_state, note, recorded_by_id, occurred_at
       FROM fact_lifecycle_event WHERE membership_id = $1 AND to_state = 'STARTER'`,
      [created.createdId],
    );
    expect(history.rows).toHaveLength(1);
    expect(history.rows[0].from_state).toBe("LEAD");
    expect(history.rows[0].note).toBe("Ha comprato lo Starter Pack");
    expect(history.rows[0].recorded_by_id).toBe(ownerId);

    // Dated by the database, and therefore agreeing with everything else it dates.
    const now = await control.query("SELECT now() AS n");
    const drift = Math.abs(
      history.rows[0].occurred_at.getTime() - now.rows[0].n.getTime(),
    );
    expect(drift, "the change was dated by the wrong clock").toBeLessThan(60_000);
  });

  it("keeps the earlier history rather than overwriting it", async () => {
    const created = await createMemberAction(
      { error: null },
      form({ name: "Storia Intera", email: "storia@actions.test" }),
    );

    await changeLifecycleAction(
      { error: null },
      form({ membershipId: created.createdId!, toState: "STARTER" }),
    );
    await changeLifecycleAction(
      { error: null },
      form({ membershipId: created.createdId!, toState: "CLIENT" }),
    );

    const { rows } = await control.query(
      `SELECT to_state FROM fact_lifecycle_event
       WHERE membership_id = $1 ORDER BY occurred_at`,
      [created.createdId],
    );
    expect(rows.map((row) => row.to_state)).toEqual(["LEAD", "STARTER", "CLIENT"]);
  });

  it("refuses a move the business does not make, and changes nothing", async () => {
    const created = await createMemberAction(
      { error: null },
      form({ name: "Salto", email: "salto@actions.test" }),
    );

    // Lead straight to Client would bypass the Starter Pack entirely.
    const outcome = await changeLifecycleAction(
      { error: null },
      form({ membershipId: created.createdId!, toState: "CLIENT" }),
    );

    expect(outcome.error).toBe("notAllowed");

    const membership = await control.query(
      "SELECT lifecycle_state FROM bridge_membership WHERE id = $1",
      [created.createdId],
    );
    expect(membership.rows[0].lifecycle_state).toBe("LEAD");

    const history = await control.query(
      "SELECT count(*)::int AS n FROM fact_lifecycle_event WHERE membership_id = $1",
      [created.createdId],
    );
    expect(history.rows[0].n, "a refused move still wrote history").toBe(1);
  });

  it("refuses a state that is not a state at all", async () => {
    const outcome = await changeLifecycleAction(
      { error: null },
      form({ membershipId: memberMembershipId, toState: "BANANA" }),
    );
    expect(outcome.error).toBe("notAllowed");
  });

  it("cannot reach a member of another company, even naming them exactly", async () => {
    // A real membership, in the demo world, belonging to somebody else entirely.
    const stranger = await control.query(
      `SELECT m.id FROM bridge_membership m JOIN dim_person p ON p.id = m.person_id
       WHERE p.email = 'cliente@example.com'`,
    );
    const strangerId = stranger.rows[0].id;
    const before = await control.query(
      "SELECT lifecycle_state FROM bridge_membership WHERE id = $1",
      [strangerId],
    );

    const outcome = await changeLifecycleAction(
      { error: null },
      form({ membershipId: strangerId, toState: "DORMANT" }),
    );

    // "Invisible" and "does not exist" are deliberately the same answer.
    expect(outcome.error).toBe("failed");

    const after = await control.query(
      "SELECT lifecycle_state FROM bridge_membership WHERE id = $1",
      [strangerId],
    );
    expect(after.rows[0].lifecycle_state).toBe(before.rows[0].lifecycle_state);
  });

  it("writes an audit entry for the change", async () => {
    const created = await createMemberAction(
      { error: null },
      form({ name: "Tracciato Due", email: "tracciato2@actions.test" }),
    );
    await changeLifecycleAction(
      { error: null },
      form({ membershipId: created.createdId!, toState: "STARTER" }),
    );

    const { rows } = await control.query(
      `SELECT before, after FROM audit_log
       WHERE table_name = 'bridge_membership' AND row_id = $1 AND action = 'UPDATE'
       ORDER BY changed_at DESC LIMIT 1`,
      [created.createdId],
    );

    expect(rows[0].before.lifecycle_state).toBe("LEAD");
    expect(rows[0].after.lifecycle_state).toBe("STARTER");
  });
});

describe("deactivating a trainer", () => {
  it("switches them off without deleting anything", async () => {
    await setTrainerActiveAction(
      form({ membershipId: trainerMembershipId, activate: "false" }),
    );

    const { rows } = await control.query(
      "SELECT is_active, deactivated_at FROM bridge_membership WHERE id = $1",
      [trainerMembershipId],
    );

    expect(rows[0].is_active).toBe(false);
    expect(rows[0].deactivated_at).not.toBeNull();
  });

  it("dates the deactivation by the database's clock, not the application's", async () => {
    await setTrainerActiveAction(
      form({ membershipId: trainerMembershipId, activate: "true" }),
    );
    await setTrainerActiveAction(
      form({ membershipId: trainerMembershipId, activate: "false" }),
    );

    const { rows } = await control.query(
      "SELECT deactivated_at, now() AS db_now FROM bridge_membership WHERE id = $1",
      [trainerMembershipId],
    );

    const drift = Math.abs(
      rows[0].deactivated_at.getTime() - rows[0].db_now.getTime(),
    );
    // Two hours would be the bug this rule exists to prevent.
    expect(drift, "the deactivation date came from the wrong clock").toBeLessThan(60_000);
  });

  it("keeps every trace of the work they did", async () => {
    await setTrainerActiveAction(
      form({ membershipId: trainerMembershipId, activate: "false" }),
    );

    const membership = await control.query(
      "SELECT id FROM bridge_membership WHERE id = $1",
      [trainerMembershipId],
    );
    const pay = await control.query(
      "SELECT model, amount FROM dim_trainer_compensation WHERE membership_id = $1",
      [trainerMembershipId],
    );

    expect(membership.rows, "the trainer's row was deleted").toHaveLength(1);
    expect(pay.rows, "what they were paid was deleted with them").toHaveLength(1);
    expect(pay.rows[0].model).toBe("REVENUE_SHARE");
  });

  it("releases their members rather than handing them to somebody chosen by software", async () => {
    // Put the assignment back, in case an earlier test in this block released it.
    await control.query(
      "UPDATE bridge_membership SET default_trainer_id = $1 WHERE id = $2",
      [trainerMembershipId, memberMembershipId],
    );

    await setTrainerActiveAction(
      form({ membershipId: trainerMembershipId, activate: "false" }),
    );

    const { rows } = await control.query(
      "SELECT default_trainer_id FROM bridge_membership WHERE id = $1",
      [memberMembershipId],
    );

    expect(
      rows[0].default_trainer_id,
      "the software picked a replacement trainer, which is the owner's decision",
    ).toBeNull();
  });

  it("clears the date again when they come back", async () => {
    await setTrainerActiveAction(
      form({ membershipId: trainerMembershipId, activate: "false" }),
    );
    await setTrainerActiveAction(
      form({ membershipId: trainerMembershipId, activate: "true" }),
    );

    const { rows } = await control.query(
      "SELECT is_active, deactivated_at FROM bridge_membership WHERE id = $1",
      [trainerMembershipId],
    );

    expect(rows[0].is_active).toBe(true);
    expect(rows[0].deactivated_at).toBeNull();
  });

  it("is refused to the front desk, because it is not their decision", async () => {
    sessionMock.mockResolvedValue({
      user: {
        id: ownerId,
        name: "Test Desk",
        email: "desk@actions.test",
        roles: [],
        scopes: [
          {
            companyId: TEST_COMPANY,
            companyName: "Actions Test Co",
            gymId: TEST_GYM,
            gymName: "Test Gym",
            role: "STAFF",
            level: "WORKER",
          },
        ],
        locale: "it",
      },
    });

    await expect(
      setTrainerActiveAction(
        form({ membershipId: trainerMembershipId, activate: "false" }),
      ),
    ).rejects.toThrow(/REDIRECT:\/denied/);
  });
});

describe("narrowing the list to one location", () => {
  /**
   * OQ-10, decided 2026-08-22: an owner of a whole company can narrow to one gym.
   *
   * The owner's framing matters and is tested here: it is **a filter, not a
   * permission**. It must never widen what somebody can see, and it must not take
   * authority away either.
   */
  function viewerWithBadge(level: string, gymId: string | null) {
    return {
      id: ownerId,
      name: "Test Owner",
      email: OWNER_EMAIL,
      platformRoles: [],
      scopes: [],
      activeScope: null,
      badge: { level, companyId: TEST_COMPANY, gymId, personId: ownerId },
      effectiveRoles: [],
      locale: "it",
    } as never;
  }

  it("shows every location when nothing is chosen", async () => {
    const all = await listMembers(viewerWithBadge("COMPANY", null));
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((row) => row.gymName === "Test Gym")).toBe(true);
  });

  it("shows only the chosen location", async () => {
    const filtered = await listMembers(viewerWithBadge("COMPANY", null), TEST_GYM);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((row) => row.gymName === "Test Gym")).toBe(true);
  });

  it("cannot be used to reach a location the badge could not already see", async () => {
    // A real gym, in the demo world, belonging to a company this badge has no claim on.
    const stranger = await control.query(
      "SELECT id FROM dim_gym WHERE name = 'Bologna'",
    );

    const smuggled = await listMembers(
      viewerWithBadge("COMPANY", null),
      stranger.rows[0].id,
    );

    expect(
      smuggled,
      "filtering by another company's gym returned rows — the filter is widening access",
    ).toEqual([]);
  });

  it("offers nothing to choose from when there is only one location", async () => {
    const choices = await gymsInScope(viewerWithBadge("COMPANY", null));
    expect(choices, "a single gym is not a choice worth offering").toEqual([]);
  });

  it("leaves the viewer's authority untouched — a filter, not a demotion", async () => {
    // The badge that went in is the badge that comes out. Narrowing the view must not
    // quietly narrow the level, or an owner would lose access by tidying their screen.
    const viewer = viewerWithBadge("COMPANY", null);
    await listMembers(viewer, TEST_GYM);

    const after = (viewer as unknown as { badge: Record<string, unknown> }).badge;
    expect(after).toEqual({
      level: "COMPANY",
      companyId: TEST_COMPANY,
      gymId: null,
      personId: ownerId,
    });
  });
});

describe("the first-password link for somebody just created", () => {
  /**
   * OQ-11, decided 2026-08-22: the platform admin is handed a single-use link rather
   * than setting a password themselves. Nobody ever knows another person's password.
   */
  function signedInAsPlatformAdmin() {
    return {
      user: {
        id: ownerId,
        name: "Ada Fondatrice",
        email: "admin@actions.test",
        roles: ["PLATFORM_ADMIN"],
        scopes: [],
        locale: "it",
      },
    };
  }

  it("hands back a link, and stores only the hash of the token behind it", async () => {
    sessionMock.mockResolvedValue(signedInAsPlatformAdmin());

    const result = await createPersonAction(
      { error: null },
      form({
        name: "Nuovo Trainer",
        email: "nuovo.trainer@actions.test",
        role: "TRAINER",
        place: TEST_COMPANY + ":" + TEST_GYM,
      }),
    );

    expect(result.error).toBeNull();
    expect(result.firstSignInLink).toMatch(/\/reset-password\?token=[0-9a-f]{64}$/);
    expect(result.createdName).toBe("Nuovo Trainer");

    const token = new URL(result.firstSignInLink!).searchParams.get("token")!;

    const stored = await control.query(
      "SELECT used_at FROM password_reset_token WHERE token_hash = $1",
      [hashToken(token)],
    );
    expect(stored.rows).toHaveLength(1);
    expect(stored.rows[0].used_at).toBeNull();

    // The raw token is nowhere in the database — only its hash, exactly as for a
    // password. A stolen backup cannot be turned into a way in.
    const raw = await control.query(
      "SELECT count(*)::int AS n FROM password_reset_token WHERE token_hash = $1",
      [token],
    );
    expect(raw.rows[0].n).toBe(0);
  });

  it("expires within the hour, like any other reset link", async () => {
    sessionMock.mockResolvedValue(signedInAsPlatformAdmin());

    const result = await createPersonAction(
      { error: null },
      form({
        name: "Scadenza",
        email: "scadenza@actions.test",
        role: "STAFF",
        place: TEST_COMPANY + ":" + TEST_GYM,
      }),
    );

    const token = new URL(result.firstSignInLink!).searchParams.get("token")!;
    const { rows } = await control.query(
      "SELECT expires_at, now() AS db_now FROM password_reset_token WHERE token_hash = $1",
      [hashToken(token)],
    );

    const life = rows[0].expires_at.getTime() - rows[0].db_now.getTime();
    expect(life).toBeGreaterThan(50 * 60 * 1000);
    expect(life).toBeLessThanOrEqual(61 * 60 * 1000);
  });

  it("mints no link at all when the person already exists", async () => {
    sessionMock.mockResolvedValue(signedInAsPlatformAdmin());

    const first = await createPersonAction(
      { error: null },
      form({
        name: "Doppione",
        email: "doppione@actions.test",
        role: "MEMBER",
        place: TEST_COMPANY + ":" + TEST_GYM,
      }),
    );
    expect(first.error).toBeNull();

    const before = await control.query(
      "SELECT count(*)::int AS n FROM password_reset_token",
    );

    const second = await createPersonAction(
      { error: null },
      form({
        name: "Doppione Due",
        email: "doppione@actions.test",
        role: "MEMBER",
        place: TEST_COMPANY + ":" + TEST_GYM,
      }),
    );

    const after = await control.query(
      "SELECT count(*)::int AS n FROM password_reset_token",
    );

    // This is the whole safety property: the screen can never be used to generate a
    // way into an account that already belongs to somebody else.
    expect(second.error).toBe("emailTaken");
    expect(second.firstSignInLink).toBeUndefined();
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });

  it("is refused to anybody who is not a platform admin", async () => {
    sessionMock.mockResolvedValue(signedInAsOwner());

    await expect(
      createPersonAction(
        { error: null },
        form({
          name: "Non Ammesso",
          email: "nonammesso@actions.test",
          role: "MEMBER",
          place: TEST_COMPANY + ":" + TEST_GYM,
        }),
      ),
    ).rejects.toThrow(/REDIRECT:\/denied/);
  });
});
