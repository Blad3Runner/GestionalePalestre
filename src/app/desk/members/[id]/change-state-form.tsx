"use client";

import { useActionState } from "react";
import { changeLifecycleAction, type LifecycleState_ } from "@/lib/members/actions";
import type { LifecycleState } from "@/lib/members/lifecycle";
import type { Dictionary } from "@/i18n/dictionaries";

const initial: LifecycleState_ = { error: null };

export function ChangeStateForm({
  t,
  membershipId,
  options,
}: {
  t: Dictionary;
  membershipId: string;
  options: readonly LifecycleState[];
}) {
  const [state, action, pending] = useActionState(changeLifecycleAction, initial);

  if (options.length === 0) {
    return null;
  }

  return (
    <form action={action} className="stack">
      <input type="hidden" name="membershipId" value={membershipId} />

      {state.error !== null ? (
        <p className="notice bad" role="alert">
          {t.members[state.error]}
        </p>
      ) : null}

      <label htmlFor="toState">{t.members.newState}</label>
      <select id="toState" name="toState" className="scope-select">
        {options.map((option) => (
          <option key={option} value={option}>
            {t.lifecycle[option]}
          </option>
        ))}
      </select>

      <label htmlFor="note">{t.members.note}</label>
      <input id="note" name="note" maxLength={500} autoComplete="off" />

      <button type="submit" disabled={pending}>
        {pending ? t.common.loading : t.members.save}
      </button>
    </form>
  );
}
