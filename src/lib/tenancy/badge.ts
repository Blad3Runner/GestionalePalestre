/**
 * The badge: who is asking, and on whose behalf.
 *
 * Declared as plain data so the middleware and the session token can carry it without
 * dragging the database client along.
 */

export const ACCESS_LEVELS = [
  "PLATFORM",
  "COMPANY",
  "GYM",
  "WORKER",
  "CLIENT",
] as const;

export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export function isAccessLevel(value: unknown): value is AccessLevel {
  return (
    typeof value === "string" && (ACCESS_LEVELS as readonly string[]).includes(value)
  );
}

export type Badge = {
  level: AccessLevel;
  /** Null only for the platform level, which belongs to no company. */
  companyId: string | null;
  /** Null when the badge covers a whole circuit rather than one location. */
  gymId: string | null;
  personId: string;
};

/**
 * Which level a set of roles earns within one company.
 *
 * A company owner automatically receives gym-level reach over every gym in the circuit
 * (docs/decisions.md, 2026-07-30) — the alternative is an owner who cannot see their own
 * schedule. That is expressed by giving them the COMPANY level, which outranks GYM.
 */
export function levelForMembership(role: string, hasGym: boolean): AccessLevel {
  switch (role) {
    case "GYM_OWNER":
      return hasGym ? "GYM" : "COMPANY";
    case "STAFF":
    case "TRAINER":
      return "WORKER";
    case "MEMBER":
      return "CLIENT";
    default:
      return "CLIENT";
  }
}

/** Higher wins when somebody holds several roles in the same company. */
const RANK: Record<AccessLevel, number> = {
  PLATFORM: 5,
  COMPANY: 4,
  GYM: 3,
  WORKER: 2,
  CLIENT: 1,
};

export function strongest(levels: readonly AccessLevel[]): AccessLevel | null {
  if (levels.length === 0) {
    return null;
  }
  return levels.reduce((best, next) => (RANK[next] > RANK[best] ? next : best));
}

export function outranks(a: AccessLevel, b: AccessLevel): boolean {
  return RANK[a] > RANK[b];
}
