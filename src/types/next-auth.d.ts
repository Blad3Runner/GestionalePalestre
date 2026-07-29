import type { Role } from "@/lib/auth/roles";
import type { Locale } from "@/i18n/locale";

/**
 * Teaches TypeScript that our sessions carry roles and a language, so that forgetting
 * to check a role is a compile error rather than a runtime surprise.
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      roles: Role[];
      locale: Locale;
    };
  }

  interface User {
    roles?: Role[];
    locale?: Locale;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles?: Role[];
    locale?: Locale;
  }
}

export {};
