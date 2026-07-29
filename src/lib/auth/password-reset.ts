import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getPrisma } from "@/lib/db";
import { hashPassword, normaliseEmail, checkPassword } from "@/lib/auth/passwords";
import { sendPasswordResetEmail } from "@/lib/email";

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
  const person = await getPrisma().person.findUnique({
    where: { email: normaliseEmail(email) },
    select: { id: true, email: true },
  });

  if (!person) {
    return;
  }

  const token = generateToken();

  await getPrisma().passwordResetToken.create({
    data: {
      personId: person.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS),
    },
  });

  const link = new URL("/reset-password", baseUrl);
  link.searchParams.set("token", token);

  await sendPasswordResetEmail(person.email, link.toString());
}

export type ResetOutcome =
  | { ok: true }
  | { ok: false; reason: "invalid-token" | "too-short" | "too-long" };

/**
 * Finishes a password reset: sets the new password and burns the token so the same
 * link cannot be used twice.
 */
export async function completePasswordReset(
  token: string,
  newPassword: string,
): Promise<ResetOutcome> {
  const problem = checkPassword(newPassword);
  if (problem !== null) {
    return { ok: false, reason: problem };
  }

  const record = await getPrisma().passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record || record.usedAt !== null || record.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "invalid-token" };
  }

  const passwordHash = await hashPassword(newPassword);

  // One transaction: the password changes and the link dies together, or neither does.
  await getPrisma().$transaction([
    getPrisma().person.update({
      where: { id: record.personId },
      data: { passwordHash },
    }),
    getPrisma().passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Any other pending link for this person is invalidated too.
    getPrisma().passwordResetToken.updateMany({
      where: { personId: record.personId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
