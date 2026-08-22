import { getText } from "@/i18n/server";
import { PATHS, requireAccess } from "@/lib/auth/guard";
import { listPeople, listPlaces } from "@/lib/platform/queries";
import { NewPersonForm } from "./new-person-form";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const viewer = await requireAccess(PATHS.admin);
  const t = await getText();
  const [people, places] = await Promise.all([
    listPeople(viewer),
    listPlaces(viewer),
  ]);

  return (
    <main>
      <h1>{t.platform.people}</h1>
      <p className="lede">{t.platform.peopleLede}</p>

      <div className="card">
        {people.length === 0 ? (
          <p style={{ margin: 0 }}>{t.platform.none}</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.platform.name}</th>
                  <th>{t.platform.role}</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr key={person.personId}>
                    <td>
                      {person.name}
                      <br />
                      <span className="muted">{person.email}</span>
                    </td>
                    <td>
                      {person.isPlatformAdmin ? (
                        <div>
                          <strong>{t.platform.platformAdmin}</strong>
                        </div>
                      ) : null}
                      {person.places.length === 0 && !person.isPlatformAdmin ? (
                        <span className="muted">{t.platform.belongsNowhere}</span>
                      ) : null}
                      {person.places.map((place) => (
                        <div key={place.membershipId}>
                          {t.roles[place.role as keyof typeof t.roles]} —{" "}
                          {place.companyName}
                          {place.gymName ? ` / ${place.gymName}` : ""}
                          {place.lifecycleState
                            ? ` · ${t.lifecycle[place.lifecycleState as keyof typeof t.lifecycle]}`
                            : ""}
                          {place.isActive ? "" : ` · ${t.platform.deactivated}`}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>{t.platform.newPerson}</h2>
        {places.length === 0 ? (
          <p style={{ margin: 0 }}>{t.platform.none}</p>
        ) : (
          <NewPersonForm t={t} places={places} />
        )}
      </div>
    </main>
  );
}
