import "dotenv/config";
import pg from "pg";

/**
 * Creates the restricted database account the application runs as.
 *
 * **This is the first task of Step 3, and the order matters more than anything else in
 * that step.** PostgreSQL's Row-Level Security is silently ignored for superusers and for
 * the role that owns a table. If the walls between companies were built while the
 * application still connected as `postgres`, every isolation test would pass while
 * absolutely nothing was protected.
 *
 * So the application gets an account that:
 *
 *   - is **not** a superuser
 *   - has **NOBYPASSRLS**, so it cannot step around a policy
 *   - **owns nothing** — tables stay owned by the privileged account
 *   - cannot create databases or roles
 *
 * Migrations keep using the privileged account, because creating tables and policies
 * requires rights the application must never hold.
 *
 * Run with:  npm run db:setup-roles
 * Safe to run repeatedly.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

/** Pulls the account name and password the application will use out of its own URL. */
function applicationCredentials(): { user: string; password: string } {
  const url = new URL(required("DATABASE_URL"));
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);

  if (user === "" || password === "") {
    throw new Error("DATABASE_URL must include both a username and a password.");
  }
  if (user === "postgres") {
    throw new Error(
      "DATABASE_URL still points at the 'postgres' superuser.\n" +
        "That account ignores Row-Level Security entirely, which would make the walls " +
        "between companies decorative. Point DATABASE_URL at the restricted account.",
    );
  }

  return { user, password };
}

async function main(): Promise<void> {
  const { user, password } = applicationCredentials();
  const database = new URL(required("DATABASE_URL")).pathname.replace(/^\//, "");

  const admin = new pg.Client({
    connectionString: required("DATABASE_MIGRATION_URL"),
  });
  await admin.connect();

  // CREATE ROLE and ALTER ROLE accept no bind parameters, so both the account name and
  // the password must be escaped into the statement. pg's own escaping does that safely.
  const quoted = admin.escapeIdentifier(user);
  const literalPassword = admin.escapeLiteral(password);

  const { rows } = await admin.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [user]);
  const verb = rows.length === 0 ? "CREATE" : "ALTER";

  await admin.query(
    `${verb} ROLE ${quoted} WITH LOGIN PASSWORD ${literalPassword}
       NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS INHERIT`,
  );

  console.log(
    rows.length === 0
      ? `  created restricted account ${user}`
      : `  restricted account ${user} already existed — settings reapplied`,
  );

  // It may reach the database and read the schema, but owns nothing in it.
  await admin.query(`GRANT CONNECT ON DATABASE "${database}" TO ${quoted}`);
  await admin.query(`GRANT USAGE ON SCHEMA public TO ${quoted}`);

  // Explicitly refused: creating tables would make it their owner, and an owner can
  // switch Row-Level Security off on its own tables.
  await admin.query(`REVOKE CREATE ON SCHEMA public FROM ${quoted}`);

  const check = await admin.query(
    "SELECT rolsuper, rolbypassrls, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = $1",
    [user],
  );
  const flags = check.rows[0];

  if (flags.rolsuper || flags.rolbypassrls) {
    throw new Error(
      `${user} can still bypass Row-Level Security. Refusing to continue.`,
    );
  }

  console.log("");
  console.log(`  superuser:      ${flags.rolsuper ? "YES — WRONG" : "no"}`);
  console.log(`  can bypass RLS: ${flags.rolbypassrls ? "YES — WRONG" : "no"}`);
  console.log(`  can create DBs: ${flags.rolcreatedb ? "yes" : "no"}`);
  console.log(`  owns tables:    no (CREATE on schema revoked)`);
  console.log("");
  console.log("  Migrations continue to use DATABASE_MIGRATION_URL.");
  console.log("");

  await admin.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
