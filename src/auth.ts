import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { getPrisma } from "@/lib/db";
import { normaliseEmail, verifyPassword } from "@/lib/auth/passwords";
import { parseRoles } from "@/lib/auth/roles";
import { localeFromLanguage } from "@/i18n/locale";
import type { Scope } from "@/lib/tenancy/scope";
import { levelForMembership } from "@/lib/tenancy/badge";

/**
 * A bcrypt hash of a password nobody has.
 *
 * When the email does not exist we still run a password check against this, so that a
 * wrong email takes exactly as long as a wrong password. Without it, the difference in
 * response time quietly tells an attacker which email addresses are real.
 */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.9pQ9j2gGQ3Xf8vJ0m0LGVn3nZ0YQ0Zu";

type PersonRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  language: string;
};

type ContextRow = {
  source: "platform" | "membership";
  role: string;
  company_id: string | null;
  gym_id: string | null;
  company_name: string | null;
  gym_name: string | null;
};

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

        const prisma = getPrisma();

        // Signing in happens before anybody is identified, so it cannot travel with a
        // badge. It goes through this one narrow function instead — one email in, one
        // person out. See the row_level_security migration.
        const [person] = await prisma.$queryRaw<PersonRow[]>`
          SELECT * FROM app.auth_find_person_by_email(${normaliseEmail(email)})
        `;

        const matches = await verifyPassword(
          password,
          person?.password_hash ?? DUMMY_HASH,
        );

        // One single failure result: never reveal whether it was the email or the
        // password that was wrong.
        if (!person || !matches) {
          return null;
        }

        const context = await prisma.$queryRaw<ContextRow[]>`
          SELECT * FROM app.auth_person_context(${person.id}::uuid)
        `;

        const platformRoles = parseRoles(
          context.filter((row) => row.source === "platform").map((row) => row.role),
        );

        const scopes: Scope[] = context
          .filter((row) => row.source === "membership" && row.company_id !== null)
          .map((row) => ({
            companyId: row.company_id as string,
            companyName: row.company_name ?? "",
            gymId: row.gym_id,
            gymName: row.gym_name,
            role: row.role,
            level: levelForMembership(row.role, row.gym_id !== null),
          }));

        return {
          id: person.id,
          name: person.name,
          email: person.email,
          roles: platformRoles,
          scopes,
          locale: localeFromLanguage(person.language),
        };
      },
    }),
  ],
});
