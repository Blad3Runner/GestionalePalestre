import Link from "next/link";
import { getLocaleAndText } from "@/i18n/server";
import { PATHS, requireAccess } from "@/lib/auth/guard";
import { getMember } from "@/lib/members/queries";
import { nextStates, type LifecycleState } from "@/lib/members/lifecycle";
import { ChangeStateForm } from "./change-state-form";

export const dynamic = "force-dynamic";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireAccess(PATHS.desk);
  const { locale, t } = await getLocaleAndText();
  const { id } = await params;

  const member = await getMember(viewer, id);

  if (member === null) {
    return (
      <main>
        <h1>{t.members.detailTitle}</h1>
        <p className="notice bad">{t.members.notFound}</p>
        <p>
          <Link href="/desk/members">{t.common.back}</Link>
        </p>
      </main>
    );
  }

  const when = (value: Date) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);

  const current = (member.lifecycleState ?? null) as LifecycleState | null;

  return (
    <main>
      <h1>{member.name}</h1>
      <p className="lede">
        {member.companyName}
        {member.gymName ? ` — ${member.gymName}` : ""}
      </p>

      <div className="card">
        <dl>
          <dt>{t.members.email}</dt>
          <dd>
            <code>{member.email}</code>
          </dd>

          <dt>{t.members.phone}</dt>
          <dd>{member.phone ?? "—"}</dd>

          <dt>{t.members.state}</dt>
          <dd>
            <strong>
              {current ? t.lifecycle[current] : "—"}
            </strong>
          </dd>

          <dt>{t.members.level}</dt>
          <dd>{member.level ?? "—"}</dd>

          <dt>{t.members.packageCap}</dt>
          <dd>{member.packageCap ?? "—"}</dd>

          <dt>{t.members.defaultTrainer}</dt>
          <dd>{member.defaultTrainerName ?? t.members.unassigned}</dd>

          <dt>{t.members.since}</dt>
          <dd>{when(member.joinedAt)}</dd>
        </dl>
      </div>

      <div className="card">
        <h2>{t.members.changeState}</h2>
        <ChangeStateForm
          t={t}
          membershipId={member.membershipId}
          options={nextStates(current)}
        />
      </div>

      <div className="card">
        <h2>{t.members.history}</h2>
        {member.history.length === 0 ? (
          <p style={{ margin: 0 }}>{t.members.noHistory}</p>
        ) : (
          <ul className="timeline">
            {member.history.map((event) => (
              <li key={event.id}>
                <strong>
                  {event.fromState
                    ? `${t.lifecycle[event.fromState as LifecycleState]} → `
                    : ""}
                  {t.lifecycle[event.toState as LifecycleState]}
                </strong>
                <br />
                <span className="muted">
                  {when(event.occurredAt)}
                  {event.recordedByName
                    ? ` · ${t.members.recordedBy} ${event.recordedByName}`
                    : ""}
                </span>
                {event.note ? <div>{event.note}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>{t.members.auditTitle}</h2>
        {member.audit.length === 0 ? (
          <p style={{ margin: 0 }}>{t.members.noAudit}</p>
        ) : (
          <ul className="timeline">
            {member.audit.map((entry) => (
              <li key={entry.id}>
                <code>
                  {entry.action} {entry.tableName}
                </code>
                <br />
                <span className="muted">
                  {when(entry.changedAt)}
                  {entry.changedByName ? ` · ${entry.changedByName}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p>
        <Link href="/desk/members">{t.common.back}</Link>
      </p>
    </main>
  );
}
