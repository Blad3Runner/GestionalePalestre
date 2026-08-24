import Link from "next/link";
import { getText } from "@/i18n/server";
import { fill } from "@/i18n/dictionaries";
import { PATHS, requireAccess } from "@/lib/auth/guard";
import { listMembers } from "@/lib/members/queries";
import { AddMemberForm } from "./add-member-form";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const viewer = await requireAccess(PATHS.desk);
  const t = await getText();
  const members = await listMembers(viewer);

  // Say plainly WHERE this list comes from. A gym-level badge is looking at one
  // location; a company-level one is looking at every location it owns at once, and
  // calling that "this location" was simply wrong.
  const scope = viewer.activeScope;
  const where = scope
    ? scope.gymName
      ? fill(t.members.ledeGym, { place: scope.gymName })
      : fill(t.members.ledeCompany, { place: scope.companyName })
    : t.members.lede;

  return (
    <main>
      <h1>{t.members.title}</h1>
      <p className="lede">{where}</p>

      <div className="card">
        {members.length === 0 ? (
          <p style={{ margin: 0 }}>{t.members.none}</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.members.name}</th>
                  <th>{t.members.state}</th>
                  <th>{t.members.level}</th>
                  <th>{t.members.gym}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.membershipId}>
                    <td>
                      {member.name}
                      <br />
                      <span className="muted">{member.email}</span>
                    </td>
                    <td>
                      {member.lifecycleState
                        ? t.lifecycle[
                            member.lifecycleState as keyof typeof t.lifecycle
                          ]
                        : "—"}
                    </td>
                    <td>{member.level ?? "—"}</td>
                    <td>{member.gymName ?? "—"}</td>
                    <td>
                      <Link href={`/desk/members/${member.membershipId}`}>
                        {t.members.open}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>{t.members.addTitle}</h2>
        <AddMemberForm t={t} />
      </div>
    </main>
  );
}
