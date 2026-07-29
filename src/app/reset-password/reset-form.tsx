"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction, type ResetState } from "@/app/actions";
import { fill, type Dictionary } from "@/i18n/dictionaries";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/passwords";

const initial: ResetState = { status: "idle", error: null };

export function ResetForm({ t, token }: { t: Dictionary; token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);

  if (state.status === "done") {
    return (
      <>
        <p className="notice ok">{t.reset.done}</p>
        <p style={{ margin: 0 }}>
          <Link href="/signin">{t.common.signIn}</Link>
        </p>
      </>
    );
  }

  const message =
    state.error === "tooShort"
      ? fill(t.reset.tooShort, { min: MIN_PASSWORD_LENGTH })
      : state.error !== null
        ? t.reset[state.error]
        : null;

  return (
    <form action={action} className="stack">
      <input type="hidden" name="token" value={token} />

      {message !== null ? (
        <p className="notice bad" role="alert">
          {message}
        </p>
      ) : null}

      <label htmlFor="password">{t.reset.newPassword}</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        required
      />

      <label htmlFor="confirm">{t.reset.confirmPassword}</label>
      <input
        id="confirm"
        name="confirm"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        required
      />

      <button type="submit" disabled={pending}>
        {pending ? t.common.loading : t.reset.submit}
      </button>
    </form>
  );
}
