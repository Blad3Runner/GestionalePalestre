import Link from "next/link";
import { getText } from "@/i18n/server";
import { currentUser } from "@/lib/auth/guard";
import { rolesAllowedFor } from "@/lib/auth/route-policy";

/**
 * Shown when somebody signed in reaches a page their roles do not allow.
 *
 * It says plainly that the page exists but is not theirs — pretending the page is
 * missing would only make the owner think the software is broken.
 */
export default async function DeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const t = await getText();
  const user = await currentUser();
  const { from } = await searchParams;

  const required = from ? rolesAllowedFor(from) : null;

  return (
    <main className="narrow">
      <h1>{t.denied.title}</h1>
      <p className="lede">{t.denied.lede}</p>

      <div className="card">
        <p style={{ marginTop: 0 }}>{t.denied.explanation}</p>

        <dl>
          {from ? (
            <>
              <dt>{t.denied.requestedPage}</dt>
              <dd>
                <code>{from}</code>
              </dd>
            </>
          ) : null}

          {required !== null ? (
            <>
              <dt>{t.denied.requiredRoles}</dt>
              <dd>{required.map((role) => t.roles[role]).join(", ")}</dd>
            </>
          ) : null}

          <dt>{t.denied.yourRoles}</dt>
          <dd>
            {user && user.roles.length > 0
              ? user.roles.map((role) => t.roles[role]).join(", ")
              : "—"}
          </dd>
        </dl>
      </div>

      <p>
        <Link href="/">{t.denied.goHome}</Link>
      </p>
    </main>
  );
}
