import { checkDatabase } from "@/lib/health";

// Always run this check freshly. A cached health page would be worse than none.
export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const database = await checkDatabase();

  return (
    <main>
      <h1>Health</h1>
      <p className="lede">
        What the application can see from where it is running, right now.
      </p>

      <div className="card">
        <h2>Application</h2>
        <p className="status ok" style={{ margin: 0 }}>
          Application running
        </p>
      </div>

      <div className="card">
        <h2>Database</h2>

        {database.connected ? (
          <>
            <p className="status ok" style={{ margin: "0 0 1rem" }}>
              Database connected — {database.version}
            </p>
            <dl>
              <dt>Database</dt>
              <dd>
                <code>{database.database}</code>
              </dd>

              <dt>Connected as</dt>
              <dd>
                <code>{database.user}</code>
              </dd>

              <dt>Business tables</dt>
              <dd>
                {database.businessTableCount}
                {database.businessTableCount === 0
                  ? " — correct for Step 1, no business tables exist yet"
                  : null}
              </dd>

              <dt>Reported as</dt>
              <dd>{database.versionFull}</dd>
            </dl>
          </>
        ) : (
          <>
            <p className="status bad" style={{ margin: "0 0 0.5rem" }}>
              Database not reachable
            </p>
            <p style={{ margin: 0 }}>
              Check that PostgreSQL is running and that <code>DATABASE_URL</code> in your{" "}
              <code>.env</code> file is correct. The exact complaint was:
            </p>
            <pre>{database.error}</pre>
          </>
        )}
      </div>
    </main>
  );
}
