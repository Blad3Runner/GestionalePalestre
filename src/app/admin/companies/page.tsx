import { getText } from "@/i18n/server";
import { PATHS, requireAccess } from "@/lib/auth/guard";
import { listCompanies } from "@/lib/platform/queries";
import { NewCompanyForm } from "./new-company-form";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const viewer = await requireAccess(PATHS.admin);
  const t = await getText();
  const companies = await listCompanies(viewer);

  return (
    <main>
      <h1>{t.platform.companies}</h1>
      <p className="lede">{t.platform.companiesLede}</p>

      <div className="card">
        {companies.length === 0 ? (
          <p style={{ margin: 0 }}>{t.platform.none}</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.platform.name}</th>
                  <th>{t.platform.businessModel}</th>
                  <th>{t.platform.gyms}</th>
                  <th>{t.platform.people}</th>
                  <th>{t.platform.fiscalId}</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.name}</td>
                    <td>{company.businessModel ?? "—"}</td>
                    <td>{company.gyms.length}</td>
                    <td>{company.people}</td>
                    <td>{company.fiscalId ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>{t.platform.newCompany}</h2>
        <NewCompanyForm t={t} />
      </div>
    </main>
  );
}
