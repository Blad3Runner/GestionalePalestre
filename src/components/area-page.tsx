import type { Dictionary } from "@/i18n/dictionaries";
import type { SignedInUser } from "@/lib/auth/guard";

/**
 * The body every protected area shares while the real screens are still to come.
 *
 * It shows who you are and which roles let you in, which is what makes the permission
 * work visible to the owner without inventing business content that belongs to a
 * later step.
 */
export function AreaPage({
  title,
  lede,
  t,
  user,
}: {
  title: string;
  lede: string;
  t: Dictionary;
  user: SignedInUser;
}) {
  return (
    <main>
      <h1>{title}</h1>
      <p className="lede">{lede}</p>

      <div className="card">
        <dl>
          <dt>{t.nav.signedInAs}</dt>
          <dd>
            {user.name} — <code>{user.email}</code>
          </dd>

          <dt>{t.nav.yourRoles}</dt>
          <dd>{user.roles.map((role) => t.roles[role]).join(", ")}</dd>
        </dl>
      </div>

      <p className="lede">{t.pages.placeholder}</p>
    </main>
  );
}
