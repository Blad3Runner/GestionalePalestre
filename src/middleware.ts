import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { canOpen } from "@/lib/auth/route-policy";
import { parseRoles } from "@/lib/auth/roles";

/**
 * The first line of defence: turns unauthorised visitors away before a page is even
 * built. It reads the same ROUTE_POLICY that each page's own guard reads, so the two
 * can never disagree.
 *
 * This is deliberately not the only check. Each protected page calls `requireAccess`
 * as well — see src/lib/auth/guard.ts.
 */
const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { pathname } = request.nextUrl;

  // A coarse early filter: every role this person holds *anywhere*. Whether they hold it
  // in the company they are currently looking at is decided precisely by `requireAccess`
  // on the page itself, which is the real lock.
  const user = request.auth?.user;
  const roles = user
    ? parseRoles([
        ...(Array.isArray(user.roles) ? user.roles : []),
        ...(Array.isArray(user.scopes)
          ? user.scopes.map((scope) => (scope as { role?: unknown }).role)
          : []),
      ])
    : null;

  const decision = canOpen(pathname, roles);

  if (decision.allowed) {
    return NextResponse.next();
  }

  if (decision.reason === "not-signed-in") {
    const signIn = new URL("/signin", request.nextUrl);
    signIn.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signIn);
  }

  const denied = new URL("/denied", request.nextUrl);
  denied.searchParams.set("from", pathname);
  return NextResponse.redirect(denied);
});

export const config = {
  // Everything except Auth.js's own endpoints and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
