import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getPrisma } from "@/lib/db";
import { hashPassword, normaliseEmail, checkPassword } from "@/lib/auth/passwords";
import { sendPasswordResetEmail } from "@/lib/email";

/**
 * The password-reset flow.
 *
 * **A note on `$queryRaw` versus `$executeRaw`.** The `app.auth_*` functions that
 * *write* return `void`. Calling them with `$queryRaw` asks Prisma to deserialize a
 * result set that does not exist, and it throws — which is exactly how this whole flow
 * came to be broken from Step 2 until 2026-08-22 without a single test noticing, because
 * the tests covered the hashing helpers and never went near the database. Anything that
 * returns nothing goes through `$executeRaw`.
 *
 * Like signing in, this happens before anybody is identified, so it cannot travel with a
 * badge. Every step goes through the narrow `app.auth_*` functions instead — the
 * application has no direct rights on the token table at all. See the
 * row_level_security migration.
 */

/**
 * How long a reset link stays usable, expressed for the database.
 *
 * **Not a moment, a duration.** The application no longer computes when a token
 * expires, nor decides whether it has: both belong to the database clock, after a
 * two-hour drift made every token expire an hour before it was created
 * (docs/decisions.md, 2026-08-22).
 */
const TOKEN_LIFETIME = "1 hour";

/**
 * Only the hash of a reset token is stored, exactly as for passwords: someone who
 * steals a copy of the database still cannot use it to take over an account.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/** Constant-time comparison, so no timing difference reveals a partly-correct token. */
export function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

type PersonRow = { id: string; email: string };
type TokenRow = {
  id: string;
  person_id: string;
  expires_at: Date;
  used_at: Date | null;
  /** The database's verdict. Never recomputed here — that is how this went wrong. */
  still_valid: boolean;
};

/**
 * Makes a first-time sign-in link for somebody who has just been created.
 *
 * **Not a way to reach an existing account.** The only caller is the platform admin's
 * "new person" screen, which refuses an email that already belongs to somebody — so a
 * link is only ever minted for an account created a moment earlier by the person now
 * holding it (docs/decisions.md, 2026-08-22, OQ-11).
 *
 * It is the ordinary reset machinery, unchanged: the same one-hour life, the same
 * single use, and only the *hash* of the token is stored. What differs is that the
 * link is handed back to the caller instead of being emailed — which is the whole
 * point, since no demo address can receive email and a real new colleague is usually
 * standing at the desk anyway.
 */
export async function createFirstSignInLink(
  personId: string,
  baseUrl: string,
): Promise<string> {
  const token = generateToken();

  // `$executeRaw`, not `$queryRaw`: this function returns nothing, and asking Prisma
  // to deserialize a void result throws.
  await getPrisma().$executeRaw`
    SELECT app.auth_create_reset_token(
      ${personId}::uuid, ${hashToken(token)}, ${TOKEN_LIFETIME}::interval
    )
  `;

  const link = new URL("/reset-password", baseUrl);
  link.searchParams.set("token", token);
  return link.toString();
}

/**
 * Starts a password reset.
 *
 * Always behaves identically whether or not the address belongs to an account, and
 * always reports success to the caller — telling a stranger "no such user" would hand
 * them a way to discover who is a client of the studio.
 */
export async function requestPasswordReset(
  email: string,
  baseUrl: string,
): Promise<void> {
  const prisma = getPrisma();

  const [person] = await prisma.$queryRaw<PersonRow[]>`
    SELECT id, email FROM app.auth_find_person_by_email(${normaliseEmail(email)})
  `;

  if (!person) {
    return;
  }

  const token = generateToken();

  await prisma.$executeRaw`
    SELECT app.auth_create_reset_token(
      ${person.id}::uuid, ${hashToken(token)}, ${TOKEN_LIFETIME}::interval
    )
  `;

  const link = new URL("/reset-password", baseUrl);
  link.searchParams.set("token", token);

  await sendPasswordResetEmail(person.email, link.toString());
}

export type ResetOutcome =
  | { ok: true }
  | { ok: false; reason: "invalid-token" | "too-short" | "too-long" };

/**
 * Finishes a password reset: sets the new password and burns the token, along with any
 * other outstanding link for that person, so no link can be used twice.
 */
export async function completePasswordReset(
  token: string,
  newPassword: string,
): Promise<ResetOutcome> {
  const problem = checkPassword(newPassword);
  if (problem !== null) {
    return { ok: false, reason: problem };
  }

  const prisma = getPrisma();

  const [record] = await prisma.$queryRaw<TokenRow[]>`
    SELECT * FROM app.auth_find_reset_token(${hashToken(token)})
  `;

  // The database already decided. Comparing dates here is what hid a two-hour drift
  // for weeks: wrong on both sides of the comparison, and therefore invisible.
  if (!record || !record.still_valid) {
    return { ok: false, reason: "invalid-token" };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$executeRaw`
    SELECT app.auth_complete_reset(${record.person_id}::uuid, ${passwordHash})
  `;

  return { ok: true };
}
