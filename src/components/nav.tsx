import Link from "next/link";
import { signOutAction, setLocaleAction } from "@/app/actions";
import { currentUser, PATHS } from "@/lib/auth/guard";
import { getLocaleAndText } from "@/i18n/server";
import { rolesAllowedFor } from "@/lib/auth/route-policy";
import { hasAnyRole } from "@/lib/auth/roles";
import { ScopeSwitcher } from "@/components/scope-switcher";
import type { Dictionary } from "@/i18n/dictionaries";

/**
 * The menu.
 *
 * It hides links the visitor cannot use, but hiding is only tidiness — the actual
 * refusal happens on the server, in `requireAccess` on each page. Typing a hidden
 * address by hand gets you nowhere.
 */
const AREAS = [
  { path: PATHS.admin, label: (t: Dictionary) => t.nav.admin },
  { path: PATHS.owner, label: (t: Dictionary) => t.nav.owner },
  { path: PATHS.desk, label: (t: Dictionary) => t.nav.desk },
  { path: PATHS.trainer, label: (t: Dictionary) => t.nav.trainer },
  { path: PATHS.member, label: (t: Dictionary) => t.nav.member },
] as const;

export async function Nav() {
  const [user, { locale, t }] = await Promise.all([
    currentUser(),
    getLocaleAndText(),
  ]);

  const visible = user
    ? AREAS.filter((area) => {
        const required = rolesAllowedFor(area.path);
        return required === null || hasAnyRole(user.effectiveRoles, required);
      })
    : [];

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        {t.common.appName}
      </Link>

      {user ? (
        <nav className="links">
          {visible.map((area) => (
            <Link key={area.path} href={area.path}>
              {area.label(t)}
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="topbar-right">
        {user ? <ScopeSwitcher viewer={user} t={t} /> : null}

        <form action={setLocaleAction} className="inline">
          <input type="hidden" name="locale" value={locale === "it" ? "en" : "it"} />
          <button type="submit" className="link-button" title={t.common.language}>
            {locale === "it" ? "EN" : "IT"}
          </button>
        </form>

        {user ? (
          <>
            <span className="who">{user.name}</span>
            <form action={signOutAction} className="inline">
              <button type="submit" className="link-button">
                {t.common.signOut}
              </button>
            </form>
          </>
        ) : (
          <Link href="/signin">{t.common.signIn}</Link>
        )}
      </div>
    </header>
  );
}
