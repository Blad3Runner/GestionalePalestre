import { getText } from "@/i18n/server";
import { PATHS, requireAccess } from "@/lib/auth/guard";
import { listCompanies } from "@/lib/platform/queries";
import { NewGymForm } from "./new-gym-form";

export const dynamic = "force-dynamic";

export default async function GymsPage() {
  const viewer = await requireAccess(PATHS.admin);
  const t = await getText();
  const companies = await listCompanies(viewer);

  const gyms = companies.flatMap((company) =>
    company.gyms.map((gym) => ({ ...gym, companyName: company.name })),
  );

  return (
    <main>
      <h1>{t.platform.gyms}</h1>
      <p className="lede">{t.platform.gymsLede}</p>

      <div className="card">
        {gyms.length === 0 ? (
          <p style={{ margin: 0 }}>{t.platform.none}</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.platform.name}</th>
                  <th>{t.platform.city}</th>
                  <th>{t.platform.company}</th>
                </tr>
              </thead>
              <tbody>
                {gyms.map((gym) => (
                  <tr key={gym.id}>
                    <td>
                      {gym.name}
                      {gym.isActive ? "" : ` (${t.platform.deactivated})`}
                    </td>
                    <td>{gym.city ?? "—"}</td>
                    <td>{gym.companyName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>{t.platform.newGym}</h2>
        {companies.length === 0 ? (
          <p style={{ margin: 0 }}>{t.platform.none}</p>
        ) : (
          <NewGymForm t={t} companies={companies} />
        )}
      </div>
    </main>
  );
}
