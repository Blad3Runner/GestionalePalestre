import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasAnyRole, parseRoles, type Role } from "@/lib/auth/roles";
import { rolesAllowedFor } from "@/lib/auth/route-policy";
import { type Locale, DEFAULT_LOCALE } from "@/i18n/locale";

/**
 * Server-side page protection.
 *
 * This is the real lock. The middleware turns unauthorised visitors away earlier, which
 * is faster and tidier, but it is a convenience — every protected page calls
 * {@link requireAccess} itself, so typing an address directly is refused by the server
 * that renders the page, not merely hidden from a menu.
 */

/** The protected areas, named once so no page can mistype its own address. */
export const PATHS = {
  admin: "/admin",
  owner: "/owner",
  desk: "/desk",
  trainer: "/trainer",
  member: "/me",
} as const;

export type SignedInUser = {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  locale: Locale;
};

/** Who is signed in, or null. Never redirects — for menus and public pages. */
export async function currentUser(): Promise<SignedInUser | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    roles: parseRoles(session.user.roles),
    locale: session.user.locale ?? DEFAULT_LOCALE,
  };
}

/**
 * Refuses the visitor unless they hold one of the roles that ROUTE_POLICY allows for
 * this path. Returns the signed-in user when they are allowed through.
 */
export async function requireAccess(pathname: string): Promise<SignedInUser> {
  const user = await currentUser();

  if (user === null) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(pathname)}`);
  }

  const required = rolesAllowedFor(pathname);
  if (required !== null && !hasAnyRole(user.roles, required)) {
    redirect(`/denied?from=${encodeURIComponent(pathname)}`);
  }

  return user;
}
