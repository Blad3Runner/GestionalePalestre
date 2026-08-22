"use client";

import { useActionState } from "react";
import { createGymAction, type CreateGymState } from "@/lib/platform/actions";
import type { Dictionary } from "@/i18n/dictionaries";
import type { CompanyRow } from "@/lib/platform/queries";

const initial: CreateGymState = { error: null };

export function NewGymForm({
  t,
  companies,
}: {
  t: Dictionary;
  companies: CompanyRow[];
}) {
  const [state, action, pending] = useActionState(createGymAction, initial);

  return (
    <form action={action} className="stack">
      {state.error !== null ? (
        <p className="notice bad" role="alert">
          {t.platform[state.error]}
        </p>
      ) : null}

      <label htmlFor="companyId">{t.platform.company}</label>
      <select id="companyId" name="companyId" required>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>

      <label htmlFor="name">{t.platform.name}</label>
      <input id="name" name="name" required autoComplete="off" />

      <label htmlFor="city">{t.platform.city}</label>
      <input id="city" name="city" autoComplete="off" />

      <label htmlFor="timezone">{t.platform.timezone}</label>
      <input id="timezone" name="timezone" defaultValue="Europe/Rome" autoComplete="off" />

      <button type="submit" disabled={pending}>
        {pending ? t.common.loading : t.platform.create}
      </button>
    </form>
  );
}
