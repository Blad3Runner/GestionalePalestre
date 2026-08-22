import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { demoConnectionString, printAccounts, seedDemoWorld } from "../prisma/seed.ts";

/**
 * PUT THE DEMO WORLD BACK TO ITS STARTING STATE.
 *
 *     npm run db:reset-demo
 *
 * Wipes every row of business data — companies, gyms, people, memberships, history and
 * the audit trail — and builds the demo world again from scratch. Anything created by
 * hand while trying the system out is destroyed. That is the point: break things
 * freely, then run this.
 *
 * **It refuses to run against anything but a local database.** The same command pointed
 * at a real client's data would be a catastrophe, so the check is not a formality.
 *
 * The structure of the database (tables, policies, triggers) is untouched — that is what
 * migrations are for. This only removes the contents.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** Tables emptied, in an order that respects the links between them. */
const TABLES = [
  "audit_log",
  "fact_lifecycle_event",
  "dim_trainer_compensation",
  "bridge_membership",
  "dim_gym",
  "dim_company",
  "person_role",
  "password_reset_token",
  "dim_person",
] as const;

function assertLocal(connectionString: string | undefined): URL {
  if (!connectionString) {
    throw new Error(
      "No database configured. Set DATABASE_MIGRATION_URL in .env — see .env.example.",
    );
  }

  const url = new URL(connectionString);
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      [
        "",
        "  REFUSED. This command wipes every row of business data.",
        `  The database it was pointed at is "${url.hostname}", which is not local.`,
        "",
        "  If you genuinely meant to empty a remote database, do it by hand,",
        "  deliberately, with a backup taken first.",
        "",
      ].join("\n"),
    );
  }
  return url;
}

async function main() {
  const connectionString = demoConnectionString();
  const url = assertLocal(connectionString);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  console.log("");
  console.log(`  Resetting the demo world in ${url.pathname.replace("/", "")} …`);

  // One statement, one transaction: either the whole world is replaced or none of it is.
  // CASCADE is not used — the order above is explicit, so nothing unexpected is caught
  // up in it if a future table arrives with a link nobody remembered.
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY`,
  );
  console.log(`  Emptied ${TABLES.length} tables.`);

  await seedDemoWorld(prisma);
  console.log("  Rebuilt.");

  printAccounts();
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
