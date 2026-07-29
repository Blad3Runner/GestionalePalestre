import { compare, hash } from "bcryptjs";

/**
 * Password handling.
 *
 * The plain password is never stored, never logged and never sent back to the browser.
 * Only the bcrypt hash goes into the database.
 */

/** Work factor. Higher is slower to crack and slower to log in; 12 is the usual balance. */
const BCRYPT_ROUNDS = 12;

/**
 * A sane minimum, deliberately nothing more (Step 2 excludes password policies).
 * The upper limit is bcrypt's own: it silently ignores anything past 72 bytes, which
 * would make two different long passwords interchangeable.
 */
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_BYTES = 72;

export type PasswordProblem = "too-short" | "too-long";

export function checkPassword(password: string): PasswordProblem | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return "too-short";
  }
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return "too-long";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const problem = checkPassword(password);
  if (problem !== null) {
    throw new Error(`Refusing to hash an unacceptable password: ${problem}`);
  }
  return hash(password, BCRYPT_ROUNDS);
}

/**
 * Checks a password against a stored hash.
 *
 * Never throws on a malformed hash — a corrupt row must read as "wrong password",
 * not as a crash that tells an attacker something.
 */
export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  try {
    return await compare(password, passwordHash);
  } catch {
    return false;
  }
}

/** Email is stored and compared lower-cased, so signing in is not case-sensitive. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}
