import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { databaseUrl } from "@/env";

/**
 * The single database client for the whole application.
 *
 * Next.js reloads modules constantly while developing, which would otherwise open a new
 * pool of database connections every time a file is saved. Caching the client on
 * `globalThis` keeps exactly one pool alive.
 */

type Client = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as unknown as { prismaClient?: Client };

export function getPrisma(): Client {
  if (!globalForPrisma.prismaClient) {
    const adapter = new PrismaPg({ connectionString: databaseUrl() });
    globalForPrisma.prismaClient = new PrismaClient({ adapter });
  }
  return globalForPrisma.prismaClient;
}
