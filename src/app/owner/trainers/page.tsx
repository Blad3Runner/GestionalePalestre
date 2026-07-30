import { getLocaleAndText } from "@/i18n/server";
import { PATHS, requireAccess } from "@/lib/auth/guard";
import { listTrainers } from "@/lib/members/queries";
import { setTrainerActiveAction } from "@/lib/members/actions";

export const dynamic = "force-dynamic";

export default async function TrainersPage() {
  const viewer = await requireAccess(PATHS.owner);
  const { locale, t } = await getLocaleAndText();
  const trainers = await listTrainers(viewer);

  const when = (value: Date) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(value);

  return (
    <main>
      <h1>{t.trainers.title}</h1>
      <p className="lede">{t.trainers.lede}</p>

      <div className="card">
        {trainers.length === 0 ? (
          <p style={{ margin: 0 }}>{t.trainers.none}</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.members.name}</th>
                  <th>{t.members.gym}</th>
                  <th>{t.trainers.clientsAssigned}</th>
                  <th>{t.members.state}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {trainers.map((trainer) => (
                  <tr key={trainer.membershipId}>
                    <td>
                      {trainer.name}
                      <br />
                      <span className="muted">{trainer.email}</span>
                    </td>
                    <td>{trainer.gymName ?? "—"}</td>
                    <td>{trainer.clientsAssigned}</td>
                    <td>
                      <span className={trainer.isActive ? "status ok" : "status bad"}>
                        {trainer.isActive ? t.trainers.active : t.trainers.inactive}
                      </span>
                      {trainer.deactivatedAt ? (
                        <>
                          <br />
                          <span className="muted">
                            {t.trainers.deactivatedOn} {when(trainer.deactivatedAt)}
                          </span>
                        </>
                      ) : null}
                    </td>
                    <td>
                      <form action={setTrainerActiveAction}>
                        <input
                          type="hidden"
                          name="membershipId"
                          value={trainer.membershipId}
                        />
                        <input
                          type="hidden"
                          name="activate"
                          value={trainer.isActive ? "false" : "true"}
                        />
                        <button type="submit" className="link-button">
                          {trainer.isActive
                            ? t.trainers.deactivate
                            : t.trainers.reactivate}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="lede">{t.trainers.historyKept}</p>
    </main>
  );
}
