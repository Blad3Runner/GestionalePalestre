import { cookies } from "next/headers";
import { auth } from "@/auth";
import { badgeFor, findScope, parseScopes, scopeKey, type Scope } from "@/lib/tenancy/scope";
import { parseRoles, type Role } from "@/lib/auth/roles";
import type { Badge } from "@/lib/tenancy/badge";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/locale";

/** Remembers which company or gym the person is currently looking at. */
export const SCOPE_COOKIE = "scope";

export type Viewer = {
  id: string;
  name: string;
  email: string;
  /** Platform-level roles. After Step 4 this is only ever PLATFORM_ADMIN. */
  platformRoles: Role[];
  /** Every company and gym they belong to. */
  scopes: Scope[];
  /** The one they are looking at now, or null for a platform admin viewing everything. */
  activeScope: Scope | null;
  /** What the database will be shown for this request. */
  badge: Badge;
  /**
   * What page protection asks about: their platform roles, plus the role they hold in
   * the place they are currently looking at. A trainer at gym A is not a trainer at
   * gym B, and this is where that stops being true by accident.
   */
  effectiveRoles: Role[];
  locale: Locale;
};

export async function currentViewer(): Promise<Viewer | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const platformRoles = parseRoles(session.user.roles);
  const scopes = parseScopes(session.user.scopes);

  const chosen = (await cookies()).get(SCOPE_COOKIE)?.value;
  const activeScope =
    (chosen ? findScope(scopes, chosen) : null) ?? scopes[0] ?? null;

  const isPlatformAdmin = platformRoles.includes("PLATFORM_ADMIN");

  const effectiveRoles = [...platformRoles];
  if (activeScope) {
    const scopeRole = parseRoles([activeScope.role])[0];
    if (scopeRole && !effectiveRoles.includes(scopeRole)) {
      effectiveRoles.push(scopeRole);
    }
  }

  // A platform admin genuinely sees across every company, so their badge says so even
  // when they have picked one company to look at.
  const badge = isPlatformAdmin
    ? { level: "PLATFORM" as const, companyId: null, gymId: null, personId: session.user.id }
    : badgeFor(session.user.id, activeScope);

  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    platformRoles,
    scopes,
    activeScope,
    badge,
    effectiveRoles,
    locale: session.user.locale ?? DEFAULT_LOCALE,
  };
}

export { scopeKey };
