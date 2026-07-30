import {
  isAccessLevel,
  strongest,
  type AccessLevel,
  type Badge,
} from "@/lib/tenancy/badge";

/**
 * A scope is one place a person belongs: a whole company, or one of its gyms.
 *
 * Somebody may hold several — an owner of a two-gym circuit, a trainer at one gym who is
 * also a member at another company. The scope currently being looked at is what the badge
 * is built from.
 */
export type Scope = {
  companyId: string;
  companyName: string;
  gymId: string | null;
  gymName: string | null;
  role: string;
  level: AccessLevel;
};

/** A stable identifier for a scope, used by the switcher and stored in a cookie. */
export function scopeKey(scope: Scope): string {
  return scope.gymId ? `${scope.companyId}:${scope.gymId}` : scope.companyId;
}

export function isScope(value: unknown): value is Scope {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.companyId === "string" &&
    candidate.companyId !== "" &&
    isAccessLevel(candidate.level)
  );
}

export function parseScopes(value: unknown): Scope[] {
  return Array.isArray(value) ? value.filter(isScope) : [];
}

/**
 * Collapses several roles in the same place into one scope carrying the strongest level.
 *
 * The founding studio's owner is both owner and trainer at his gym; he should see the
 * gym as an owner, not be demoted to a worker by also being a trainer.
 */
export function mergeScopes(scopes: readonly Scope[]): Scope[] {
  const byKey = new Map<string, Scope>();

  for (const scope of scopes) {
    const key = scopeKey(scope);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, scope);
      continue;
    }
    const best = strongest([existing.level, scope.level]);
    if (best === scope.level && best !== existing.level) {
      byKey.set(key, scope);
    }
  }

  return [...byKey.values()];
}

export function findScope(scopes: readonly Scope[], key: string): Scope | null {
  return scopes.find((scope) => scopeKey(scope) === key) ?? null;
}

/**
 * Turns the scope being looked at into the badge the database will be shown.
 *
 * A platform admin carries no company: they see across all of them.
 */
export function badgeFor(personId: string, scope: Scope | null): Badge {
  if (scope === null) {
    return { level: "PLATFORM", companyId: null, gymId: null, personId };
  }
  return {
    level: scope.level,
    companyId: scope.companyId,
    gymId: scope.gymId,
    personId,
  };
}
