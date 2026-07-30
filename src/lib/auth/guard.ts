import { redirect } from "next/navigation";
import { hasAnyRole, type Role } from "@/lib/auth/roles";
import { rolesAllowedFor } from "@/lib/auth/route-policy";
import { currentViewer, type Viewer } from "@/lib/tenancy/active-scope";

/**
 * Server-side page protection.
 *
 * This is the real lock on the *pages*. The middleware turns unauthorised visitors away
 * earlier, which is faster and tidier, but it is a convenience — every protected page
 * calls {@link requireAccess} itself, so typing an address directly is refused by the
 * server that renders the page, not merely hidden from a menu.
 *
 * Below this sits a second, entirely independent lock: Row-Level Security in the
 * database, which refuses to hand over another company's rows even if this code were
 * wrong. See src/lib/tenancy/wall.test.ts.
 *
 * Since Step 3 the question is not "does this person hold role X?" but "do they hold it
 * **here**?" — see `effectiveRoles`.
 */

/** The protected areas, named once so no page can mistype its own address. */
export const PATHS = {
  admin: "/admin",
  owner: "/owner",
  desk: "/desk",
  trainer: "/trainer",
  member: "/me",
} as const;

export type SignedInUser = Viewer;

/** Who is signed in, or null. Never redirects — for menus and public pages. */
export async function currentUser(): Promise<Viewer | null> {
  return currentViewer();
}

/**
 * Refuses the visitor unless they hold, **in the place they are currently looking at**,
 * one of the roles ROUTE_POLICY allows for this path.
 */
export async function requireAccess(pathname: string): Promise<Viewer> {
  const viewer = await currentUser();

  if (viewer === null) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(pathname)}`);
  }

  const required: readonly Role[] | null = rolesAllowedFor(pathname);
  if (required !== null && !hasAnyRole(viewer.effectiveRoles, required)) {
    redirect(`/denied?from=${encodeURIComponent(pathname)}`);
  }

  return viewer;
}
