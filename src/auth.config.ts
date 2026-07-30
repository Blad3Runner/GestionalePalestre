import type { NextAuthConfig } from "next-auth";
import { parseRoles } from "@/lib/auth/roles";
import { mergeScopes, parseScopes } from "@/lib/tenancy/scope";
import { resolveLocale } from "@/i18n/locale";

/**
 * The half of the authentication setup that carries no database code.
 *
 * The middleware runs in a stripped-down environment where the database client cannot
 * go, so it imports only this file. The full configuration, with the password check,
 * lives in `auth.ts`.
 */
export const authConfig = {
  // Sessions are held in a signed cookie rather than a database table. This is required
  // by Auth.js when signing in with a password, and it keeps the middleware fast.
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },

  pages: {
    signIn: "/signin",
    error: "/signin",
  },

  callbacks: {
    /** Copies the roles and the places they belong onto the token when somebody signs in. */
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.roles = parseRoles((user as { roles?: unknown }).roles);
        token.scopes = mergeScopes(parseScopes((user as { scopes?: unknown }).scopes));
        token.locale = resolveLocale((user as { locale?: unknown }).locale);
      }
      if (trigger === "update" && session && typeof session === "object") {
        const next = (session as { locale?: unknown }).locale;
        if (next !== undefined) {
          token.locale = resolveLocale(next);
        }
      }
      return token;
    },

    /** Exposes the roles and scopes to server code and pages. */
    session({ session, token }) {
      session.user.id = typeof token.sub === "string" ? token.sub : "";
      session.user.roles = parseRoles(token.roles);
      session.user.scopes = parseScopes(token.scopes);
      session.user.locale = resolveLocale(token.locale);
      return session;
    },
  },

  // Filled in by auth.ts. The middleware never needs a provider — it only reads the
  // token that signing in already produced.
  providers: [],
} satisfies NextAuthConfig;
