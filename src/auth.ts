import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { getPrisma } from "@/lib/db";
import { normaliseEmail, verifyPassword } from "@/lib/auth/passwords";
import { parseRoles } from "@/lib/auth/roles";
import { localeFromLanguage } from "@/i18n/locale";

/**
 * A bcrypt hash of a password nobody has.
 *
 * When the email does not exist we still run a password check against this, so that a
 * wrong email takes exactly as long as a wrong password. Without it, the difference in
 * response time quietly tells an attacker which email addresses are real.
 */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.9pQ9j2gGQ3Xf8vJ0m0LGVn3nZ0YQ0Zu";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }
        if (email.trim() === "" || password === "") {
          return null;
        }

        const person = await getPrisma().person.findUnique({
          where: { email: normaliseEmail(email) },
          include: { roles: true },
        });

        const matches = await verifyPassword(
          password,
          person?.passwordHash ?? DUMMY_HASH,
        );

        // One single failure result: never reveal whether it was the email or the
        // password that was wrong.
        if (!person || !matches) {
          return null;
        }

        return {
          id: person.id,
          name: person.name,
          email: person.email,
          roles: parseRoles(person.roles.map((entry) => entry.role)),
          locale: localeFromLanguage(person.language),
        };
      },
    }),
  ],
});
