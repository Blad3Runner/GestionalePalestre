import Link from "next/link";
import { currentUser, PATHS } from "@/lib/auth/guard";
import { getLocaleAndText } from "@/i18n/server";
import { rolesAllowedFor } from "@/lib/auth/route-policy";
import { hasAnyRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

const AREAS = [
  { path: PATHS.admin, key: "admin" },
  { path: PATHS.owner, key: "owner" },
  { path: PATHS.desk, key: "desk" },
  { path: PATHS.trainer, key: "trainer" },
  { path: PATHS.member, key: "member" },
] as const;

export default async function HomePage() {
  const [user, { t }] = await Promise.all([currentUser(), getLocaleAndText()]);

  if (user === null) {
    return (
      <main>
        <h1>{t.common.appName}</h1>
        <p className="lede">{t.signIn.lede}</p>
        <div className="card">
          <p style={{ margin: 0 }}>
            <Link href="/signin">{t.common.signIn}</Link>
          </p>
        </div>
      </main>
    );
  }

  const mine = AREAS.filter((area) => {
    const required = rolesAllowedFor(area.path);
    return required === null || hasAnyRole(user.effectiveRoles, required);
  });

  return (
    <main>
      <h1>{t.common.appName}</h1>
      <p className="lede">
        {t.nav.signedInAs} {user.name} —{" "}
        {user.effectiveRoles.map((r) => t.roles[r]).join(", ")}
        {user.activeScope ? ` · ${user.activeScope.companyName}` : ""}
        {user.activeScope?.gymName ? ` — ${user.activeScope.gymName}` : ""}
      </p>

      <div className="card">
        <h2>{t.nav.title}</h2>
        <ul className="area-list">
          {mine.map((area) => (
            <li key={area.path}>
              <Link href={area.path}>{t.nav[area.key]}</Link>
            </li>
          ))}
        </ul>
      </div>

      <p className="lede">{t.pages.placeholder}</p>
    </main>
  );
}
