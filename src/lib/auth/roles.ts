/**
 * The five roles of the platform.
 *
 * Declared here as plain data rather than imported from the generated Prisma client,
 * because this list is read by the middleware, which runs in a restricted environment
 * where the database client cannot go. `roles.test.ts` checks that this list and the
 * database enum never drift apart.
 */
export const ROLES = [
  "PLATFORM_ADMIN",
  "GYM_OWNER",
  "STAFF",
  "TRAINER",
  "MEMBER",
] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Keeps only the valid roles out of whatever was found in a session token. */
export function parseRoles(value: unknown): Role[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRole);
}

/** True when the person holds at least one of the roles being asked for. */
export function hasAnyRole(held: readonly Role[], required: readonly Role[]): boolean {
  return required.some((role) => held.includes(role));
}
