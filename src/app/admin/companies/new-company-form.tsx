"use client";

import { useActionState } from "react";
import {
  createCompanyAction,
  type CreateCompanyState,
} from "@/lib/platform/actions";
import type { Dictionary } from "@/i18n/dictionaries";

const initial: CreateCompanyState = { error: null };

export function NewCompanyForm({ t }: { t: Dictionary }) {
  const [state, action, pending] = useActionState(createCompanyAction, initial);

  return (
    <form action={action} className="stack">
      {state.error !== null ? (
        <p className="notice bad" role="alert">
          {t.platform[state.error]}
        </p>
      ) : null}

      <label htmlFor="name">{t.platform.name}</label>
      <input id="name" name="name" required autoComplete="off" />

      <label htmlFor="fiscalId">{t.platform.fiscalId}</label>
      <input id="fiscalId" name="fiscalId" autoComplete="off" />

      <label htmlFor="businessModel">{t.platform.businessModel}</label>
      <select id="businessModel" name="businessModel" defaultValue="CREDITS">
        <option value="CREDITS">{t.platform.modelCredits}</option>
        <option value="SUBSCRIPTIONS">{t.platform.modelSubscriptions}</option>
        <option value="BOTH">{t.platform.modelBoth}</option>
      </select>

      <button type="submit" disabled={pending}>
        {pending ? t.common.loading : t.platform.create}
      </button>
    </form>
  );
}
