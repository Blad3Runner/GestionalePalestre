import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Configuration for the Prisma command-line tool.
 *
 * It uses **DATABASE_MIGRATION_URL**, the privileged account — creating tables, policies
 * and indexes requires rights the application itself must never hold. The application
 * connects with the restricted account in DATABASE_URL instead; see src/lib/db.ts.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_MIGRATION_URL"] ?? process.env["DATABASE_URL"],
  },
});
