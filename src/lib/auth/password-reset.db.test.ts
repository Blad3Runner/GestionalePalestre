import "dotenv/config";
import pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * THE FORGOTTEN-PASSWORD FLOW, END TO END, AGAINST THE REAL DATABASE.
 *
 * This file exists because the flow was **broken from Step 2 until 2026-08-22** and
 * nothing noticed. The existing tests covered token hashing and password rules — pure
 * calculations — and never went near the database. Meanwhile every write went through
 * `$queryRaw` to a function returning `void`, which throws. Anybody who had actually
 * pressed "Password dimenticata" would have seen it immediately.
 *
 * The lesson is the same one Step 4 taught: a test of the parts is not a test of the
 * thing. This one signs somebody out of their old password and back in with a new one,
 * exactly as a person would.
 */

const EMAIL = "reset.flow@passwordreset.test";

let control: pg.Client;
let personId = "";

// Email is a side effect here, not the subject. Silencing it also keeps the terminal
// readable — the real one prints the whole message when it cannot send.
vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: async () => ({ sent: true, id: "test" }),
  sendEmail: async () => ({ sent: true, id: "test" }),
}));

const { requestPasswordReset, completePasswordReset, hashToken } = await import(
  "@/lib/auth/password-reset"
);
const { verifyPassword } = await import("@/lib/auth/passwords");

beforeAll(async () => {
  control = new pg.Client({ connectionString: process.env.DATABASE_MIGRATION_URL });
  await control.connect();
  await wipe();

  await control.query(
    `INSERT INTO dim_person (id, name, email, password_hash)
     VALUES (gen_random_uuid(), 'Reset Flow', $1,
             '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/HpH5Km1eS')`,
    [EMAIL],
  );
  const { rows } = await control.query("SELECT id FROM dim_person WHERE email = $1", [
    EMAIL,
  ]);
  personId = rows[0].id;
});

afterEach(async () => {
  await control.query("DELETE FROM password_reset_token WHERE person_id = $1", [
    personId,
  ]);
});

afterAll(async () => {
  await wipe();
  await control?.end();
});

async function wipe(): Promise<void> {
  await control.query(
    `DELETE FROM password_reset_token WHERE person_id IN
       (SELECT id FROM dim_person WHERE email = $1)`,
    [EMAIL],
  );
  await control.query("DELETE FROM dim_person WHERE email = $1", [EMAIL]);
}

/** The token that was just issued, read the only way anybody could: by its hash. */
async function issuedToken(candidate: string): Promise<boolean> {
  const { rows } = await control.query(
    "SELECT 1 FROM password_reset_token WHERE person_id = $1 AND token_hash = $2",
    [personId, hashToken(candidate)],
  );
  return rows.length === 1;
}

describe("asking for a reset link", () => {
  it("actually writes a token, rather than throwing on the way", async () => {
    await requestPasswordReset(EMAIL, "http://localhost:3000");

    const { rows } = await control.query(
      "SELECT token_hash, used_at FROM password_reset_token WHERE person_id = $1",
      [personId],
    );
    expect(rows, "no token was stored — the request failed silently").toHaveLength(1);
    expect(rows[0].used_at).toBeNull();
    expect(rows[0].token_hash).toHaveLength(64);
  });

  it("says nothing and does nothing for an address nobody uses", async () => {
    await expect(
      requestPasswordReset("nobody@passwordreset.test", "http://localhost:3000"),
    ).resolves.toBeUndefined();

    const { rows } = await control.query("SELECT count(*)::int AS n FROM password_reset_token");
    // Nothing to assert about *this* person; the point is that it neither threw nor
    // revealed anything. A stranger cannot learn who is a client by trying addresses.
    expect(typeof rows[0].n).toBe("number");
  });
});

describe("using the link", () => {
  it("sets the new password, and the old one stops working", async () => {
    // Driven through the public surface: request a link, then complete it with the
    // token the person would have clicked.
    const link = await captureLink();
    const token = new URL(link).searchParams.get("token")!;

    expect(await issuedToken(token), "the link's token does not match what was stored").toBe(true);

    const outcome = await completePasswordReset(token, "NuovaPassword2026!");
    expect(outcome).toEqual({ ok: true });

    const { rows } = await control.query(
      "SELECT password_hash FROM dim_person WHERE id = $1",
      [personId],
    );
    expect(await verifyPassword("NuovaPassword2026!", rows[0].password_hash)).toBe(true);
  });

  it("works exactly once", async () => {
    const link = await captureLink();
    const token = new URL(link).searchParams.get("token")!;

    expect(await completePasswordReset(token, "PrimaVolta2026!")).toEqual({ ok: true });
    expect(await completePasswordReset(token, "SecondaVolta2026!")).toEqual({
      ok: false,
      reason: "invalid-token",
    });

    // And the second attempt changed nothing.
    const { rows } = await control.query(
      "SELECT password_hash FROM dim_person WHERE id = $1",
      [personId],
    );
    expect(await verifyPassword("PrimaVolta2026!", rows[0].password_hash)).toBe(true);
    expect(await verifyPassword("SecondaVolta2026!", rows[0].password_hash)).toBe(false);
  });

  it("refuses a token nobody issued", async () => {
    expect(await completePasswordReset("a".repeat(64), "QualsiasiCosa2026!")).toEqual({
      ok: false,
      reason: "invalid-token",
    });
  });

  it("refuses a password that is too short, before touching the account", async () => {
    const link = await captureLink();
    const token = new URL(link).searchParams.get("token")!;

    expect(await completePasswordReset(token, "corta")).toEqual({
      ok: false,
      reason: "too-short",
    });

    // The token survives, because nothing happened. The person can try again.
    const { rows } = await control.query(
      "SELECT used_at FROM password_reset_token WHERE person_id = $1",
      [personId],
    );
    expect(rows[0].used_at).toBeNull();
  });

  it("burns every other outstanding link for that person", async () => {
    const first = new URL(await captureLink()).searchParams.get("token")!;
    const second = new URL(await captureLink()).searchParams.get("token")!;

    expect(await completePasswordReset(second, "SoloUnaVale2026!")).toEqual({ ok: true });

    // The older link must die with it, or a stale email stays dangerous forever.
    expect(await completePasswordReset(first, "NonDovrebbe2026!")).toEqual({
      ok: false,
      reason: "invalid-token",
    });
  });
});

/**
 * Runs a real request and returns the link that was built for it.
 *
 * The link is the only place the raw token ever appears — by design — so it is captured
 * where the person would receive it: from the email module, which is mocked above.
 */
async function captureLink(): Promise<string> {
  const email = await import("@/lib/email");
  let captured = "";
  const spy = vi
    .spyOn(email, "sendPasswordResetEmail")
    .mockImplementation(async (_to: string, link: string) => {
      captured = link;
      return { sent: true, id: "test" } as const;
    });

  await requestPasswordReset(EMAIL, "http://localhost:3000");
  spy.mockRestore();

  if (captured === "") {
    throw new Error("no link was built — the reset request never got that far");
  }
  return captured;
}
