import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { databaseUrl } from "@/env";
import type { Badge } from "@/lib/tenancy/badge";

/**
 * The database client, and the badge that every tenant query travels with.
 *
 * The application connects as `gestionale_app` — not a superuser, unable to bypass
 * Row-Level Security, owner of nothing. That restriction is what makes the policies in
 * the database real rather than decorative.
 */

type Client = InstanceType<typeof PrismaClient>;

/** Anything that can run a query: the client itself, or a transaction inside it. */
export type Queryable = Omit<
  Client,
  "$connect" | "$disconnect" | "$transaction" | "$extends"
>;

const globalForPrisma = globalThis as unknown as { prismaClient?: Client };

export function getPrisma(): Client {
  if (!globalForPrisma.prismaClient) {
    const adapter = new PrismaPg({ connectionString: databaseUrl() });
    globalForPrisma.prismaClient = new PrismaClient({ adapter });
  }
  return globalForPrisma.prismaClient;
}

/**
 * Runs work inside a transaction that carries a badge.
 *
 * `set_config(..., true)` is the function form of `SET LOCAL`: the value lasts exactly as
 * long as this transaction and then disappears. That is what makes the arrangement safe
 * when database connections are shared between requests — a badge cannot leak into
 * somebody else's query.
 *
 * **Every read or write of tenant data must go through here.** Forgetting is not a
 * security hole: with no badge set, the policies match nothing and the query comes back
 * empty. It fails loudly and empty rather than leaking quietly.
 */
export async function withBadge<T>(
  badge: Badge,
  work: (tx: Queryable) => Promise<T>,
): Promise<T> {
  return getPrisma().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT
      set_config('app.access_level', ${badge.level}, true),
      set_config('app.company_id', ${badge.companyId ?? ""}, true),
      set_config('app.gym_id', ${badge.gymId ?? ""}, true),
      set_config('app.person_id', ${badge.personId}, true)`;

    return work(tx as unknown as Queryable);
  });
}

/**
 * Runs work with no badge at all.
 *
 * Only for the few operations that must happen before anybody is identified — signing in,
 * and the password-reset flow. Those go through the `app.auth_*` functions, whose shape
 * is their limit. Tenant tables return nothing here, by design.
 */
export async function withoutBadge<T>(
  work: (tx: Queryable) => Promise<T>,
): Promise<T> {
  return work(getPrisma() as unknown as Queryable);
}
