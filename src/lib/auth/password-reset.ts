import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getPrisma } from "@/lib/db";
import { hashPassword, normaliseEmail, checkPassword } from "@/lib/auth/passwords";
import { sendPasswordResetEmail } from "@/lib/email";

/**
 * The password-reset flow.
 *
 * Like signing in, this happens before anybody is identified, so it cannot travel with a
 * badge. Every step goes through the narrow `app.auth_*` functions instead — the
 * application has no direct rights on the token table at all. See the
 * row_level_security migration.
 */

/** How long a reset link stays usable. */
const TOKEN_LIFETIME_MS = 60 * 60 * 1000;

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
};

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
  const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS);

  await prisma.$queryRaw`
    SELECT app.auth_create_reset_token(
      ${person.id}::uuid, ${hashToken(token)}, ${expiresAt}::timestamptz
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

  if (!record || record.used_at !== null || record.expires_at.getTime() < Date.now()) {
    return { ok: false, reason: "invalid-token" };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$queryRaw`
    SELECT app.auth_complete_reset(${record.person_id}::uuid, ${passwordHash})
  `;

  return { ok: true };
}
