"use client";

import { useActionState } from "react";
import { createPersonAction, type CreatePersonState } from "@/lib/platform/actions";
import { fill, type Dictionary } from "@/i18n/dictionaries";
import type { PlaceOption } from "@/lib/platform/queries";

const initial: CreatePersonState = { error: null };

/** Only these four. Platform admin is deliberately not on the list. */
const ROLES = ["GYM_OWNER", "STAFF", "TRAINER", "MEMBER"] as const;

export function NewPersonForm({
  t,
  places,
}: {
  t: Dictionary;
  places: PlaceOption[];
}) {
  const [state, action, pending] = useActionState(createPersonAction, initial);

  return (
    <form action={action} className="stack">
      {state.error !== null ? (
        <p className="notice bad" role="alert">
          {t.platform[state.error]}
        </p>
      ) : null}

      {state.error === null && state.firstSignInLink ? (
        <div className="notice ok" role="status">
          <p style={{ marginTop: 0 }}>
            <strong>{fill(t.platform.created, { name: state.createdName ?? "" })}</strong>
          </p>
          <p>
            <strong>{t.platform.firstSignInTitle}</strong>
          </p>
          {/* Selectable rather than a link: it is meant to be copied and handed over,
              not followed by whoever created the account. */}
          <code className="setup-link">{state.firstSignInLink}</code>
          <p style={{ marginBottom: 0 }}>
            {fill(t.platform.firstSignInHelp, { name: state.createdName ?? "" })}
          </p>
        </div>
      ) : null}

      <label htmlFor="name">{t.platform.name}</label>
      <input id="name" name="name" required autoComplete="off" />

      <label htmlFor="email">{t.platform.email}</label>
      <input id="email" name="email" type="email" required autoComplete="off" />

      <label htmlFor="phone">{t.platform.phone}</label>
      <input id="phone" name="phone" autoComplete="off" />

      <label htmlFor="role">{t.platform.role}</label>
      <select id="role" name="role" defaultValue="MEMBER" required>
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {t.roles[role]}
          </option>
        ))}
      </select>

      <label htmlFor="place">{t.platform.company}</label>
      <select id="place" name="place" required>
        {places.map((place) => (
          <option
            key={`${place.companyId}:${place.gymId ?? ""}`}
            value={place.gymId ? `${place.companyId}:${place.gymId}` : place.companyId}
          >
            {place.gymName
              ? `${place.companyName} — ${place.gymName}`
              : `${place.companyName} · ${t.platform.wholeCompany}`}
          </option>
        ))}
      </select>

      <button type="submit" disabled={pending}>
        {pending ? t.common.loading : t.platform.create}
      </button>

      <p className="notice" style={{ margin: "0.5rem 0 0" }}>
        {t.platform.noPasswordYet}
      </p>

      <p className="lede" style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}>
        {t.platform.noAdminHere}
      </p>
    </form>
  );
}
