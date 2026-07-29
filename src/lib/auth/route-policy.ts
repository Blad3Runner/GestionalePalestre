import { hasAnyRole, type Role } from "@/lib/auth/roles";

/**
 * Who may see what.
 *
 * This is the single place where a page declares which roles may open it. Both the
 * middleware (which stops a request early) and each page's own server-side guard read
 * this same list, so a page can never be protected in the menu but open in reality.
 *
 * Order matters: the first matching prefix wins, so put more specific paths first.
 */
export type RouteRule = {
  prefix: string;
  roles: readonly Role[];
};

export const ROUTE_POLICY: readonly RouteRule[] = [
  { prefix: "/admin", roles: ["PLATFORM_ADMIN"] },
  { prefix: "/owner", roles: ["GYM_OWNER"] },
  { prefix: "/desk", roles: ["GYM_OWNER", "STAFF"] },
  { prefix: "/trainer", roles: ["TRAINER"] },
  { prefix: "/me", roles: ["MEMBER"] },
] as const;

/** Pages anyone may see, signed in or not. */
export const PUBLIC_PREFIXES: readonly string[] = [
  "/",
  "/health",
  "/signin",
  "/forgot-password",
  "/reset-password",
] as const;

function matches(pathname: string, prefix: string): boolean {
  if (prefix === "/") {
    return pathname === "/";
  }
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => matches(pathname, prefix));
}

/**
 * The roles allowed to open this path, or `null` if the path is not restricted.
 *
 * Anything that is neither public nor listed in ROUTE_POLICY is treated as
 * signed-in-only by {@link canOpen} — a new page is private until someone says
 * otherwise, never accidentally public.
 */
export function rolesAllowedFor(pathname: string): readonly Role[] | null {
  const rule = ROUTE_POLICY.find((candidate) => matches(pathname, candidate.prefix));
  return rule ? rule.roles : null;
}

export type AccessDecision =
  | { allowed: true }
  | { allowed: false; reason: "not-signed-in" | "wrong-role" };

/**
 * The whole authorisation rule of the application, in one pure function.
 *
 * `heldRoles` is null when nobody is signed in.
 */
export function canOpen(
  pathname: string,
  heldRoles: readonly Role[] | null,
): AccessDecision {
  if (isPublicPath(pathname)) {
    return { allowed: true };
  }

  if (heldRoles === null) {
    return { allowed: false, reason: "not-signed-in" };
  }

  const required = rolesAllowedFor(pathname);
  if (required === null) {
    // Restricted but unlisted: being signed in is enough.
    return { allowed: true };
  }

  return hasAnyRole(heldRoles, required)
    ? { allowed: true }
    : { allowed: false, reason: "wrong-role" };
}
