import { getPrisma } from "@/lib/db";

export type DatabaseStatus =
  | {
      connected: true;
      /** Short form, e.g. "PostgreSQL 17.2". */
      version: string;
      /** The full string PostgreSQL reports about itself. */
      versionFull: string;
      /** Which database the application is actually talking to. */
      database: string;
      /** Which login it connected as. */
      user: string;
      /**
       * Tables holding real data, excluding Prisma's own `_prisma_migrations`
       * bookkeeping table. Zero is correct in Step 1.
       */
      businessTableCount: number;
    }
  | { connected: false; error: string };

type VersionRow = {
  version_full: string;
  database: string;
  user: string;
};

type CountRow = { table_count: bigint };

/**
 * Turns PostgreSQL's very long self-description into something a human can read.
 *
 * PostgreSQL answers `SELECT version()` with a whole sentence, for example
 * "PostgreSQL 17.2 on x86_64-windows, compiled by msvc-19.42, 64-bit". The health page
 * only needs the product and the number.
 */
export function shortenPostgresVersion(raw: string): string {
  const match = /^\s*(PostgreSQL)\s+(\d[\w.]*)/i.exec(raw);
  if (match === null) {
    return raw.trim();
  }
  return `${match[1]} ${match[2]}`;
}

/**
 * Asks the database three questions: who are you, which database is this, and how many
 * tables do you hold. Never throws — a database that is down is a result to display,
 * not a crash.
 */
export async function checkDatabase(): Promise<DatabaseStatus> {
  try {
    const prisma = getPrisma();

    const [info] = await prisma.$queryRaw<VersionRow[]>`
      SELECT version()          AS version_full,
             current_database() AS database,
             current_user       AS user
    `;

    const [tables] = await prisma.$queryRaw<CountRow[]>`
      SELECT count(*) AS table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name <> '_prisma_migrations'
    `;

    return {
      connected: true,
      version: shortenPostgresVersion(info.version_full),
      versionFull: info.version_full,
      database: info.database,
      user: info.user,
      businessTableCount: Number(tables.table_count),
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
