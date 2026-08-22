import Link from "next/link";
import { getText } from "@/i18n/server";
import { PATHS, requireAccess } from "@/lib/auth/guard";
import { listCompanies } from "@/lib/platform/queries";

export const dynamic = "force-dynamic";

/**
 * The founders' overview: every company in the system, with its locations and how many
 * people are in it.
 *
 * This is the only screen in the product that sees across companies, and it does so
 * because the badge says PLATFORM — not because the query forgot to filter.
 */
export default async function AdminPage() {
  // The real lock: refuses on the server before anything is rendered.
  const viewer = await requireAccess(PATHS.admin);
  const t = await getText();
  const companies = await listCompanies(viewer);

  return (
    <main>
      <h1>{t.platform.title}</h1>
      <p className="lede">{t.platform.lede}</p>

      <div className="card">
        <ul className="area-list">
          <li>
            <Link href="/admin/companies">{t.platform.newCompany}</Link>
          </li>
          <li>
            <Link href="/admin/gyms">{t.platform.newGym}</Link>
          </li>
          <li>
            <Link href="/admin/people">{t.platform.newPerson}</Link>
          </li>
        </ul>
      </div>

      {companies.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0 }}>{t.platform.none}</p>
        </div>
      ) : (
        companies.map((company) => (
          <div className="card" key={company.id}>
            <h2 style={{ marginTop: 0 }}>
              {company.name}
              {company.isActive ? "" : ` — ${t.platform.deactivated}`}
            </h2>
            <p className="muted" style={{ marginTop: 0 }}>
              {company.businessModel ? `${company.businessModel} · ` : ""}
              {company.gyms.length} {t.platform.gymCount} · {company.people}{" "}
              {t.platform.peopleCount}
              {company.fiscalId ? ` · ${company.fiscalId}` : ""}
            </p>
            <ul className="area-list">
              {company.gyms.map((gym) => (
                <li key={gym.id}>
                  {gym.name}
                  {gym.city ? ` — ${gym.city}` : ""}
                  {gym.isActive ? "" : ` (${t.platform.deactivated})`}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </main>
  );
}
