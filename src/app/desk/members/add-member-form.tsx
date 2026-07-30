"use client";

import { useActionState } from "react";
import { createMemberAction, type CreateMemberState } from "@/lib/members/actions";
import type { Dictionary } from "@/i18n/dictionaries";

const initial: CreateMemberState = { error: null };

export function AddMemberForm({ t }: { t: Dictionary }) {
  const [state, action, pending] = useActionState(createMemberAction, initial);

  return (
    <form action={action} className="stack">
      {state.error !== null ? (
        <p className="notice bad" role="alert">
          {t.members[state.error]}
        </p>
      ) : null}

      <label htmlFor="name">{t.members.name}</label>
      <input id="name" name="name" required autoComplete="off" />

      <label htmlFor="email">{t.members.email}</label>
      <input id="email" name="email" type="email" required autoComplete="off" />

      <label htmlFor="phone">{t.members.phone}</label>
      <input id="phone" name="phone" autoComplete="off" />

      <label htmlFor="level">{t.members.level}</label>
      <input id="level" name="level" autoComplete="off" />

      <label htmlFor="packageCap">{t.members.packageCap}</label>
      <input id="packageCap" name="packageCap" type="number" min={1} max={6} />

      <button type="submit" disabled={pending}>
        {pending ? t.common.loading : t.members.add}
      </button>

      <p className="lede" style={{ margin: "0.5rem 0 0", fontSize: "0.85rem" }}>
        {t.members.noPasswordYet}
      </p>
    </form>
  );
}
