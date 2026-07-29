"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, type SignInState } from "@/app/actions";
import type { Dictionary } from "@/i18n/dictionaries";

const initial: SignInState = { error: null };

export function SignInForm({
  t,
  callbackUrl,
}: {
  t: Dictionary;
  callbackUrl: string;
}) {
  const [state, action, pending] = useActionState(signInAction, initial);

  return (
    <form action={action} className="stack">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {state.error !== null ? (
        <p className="notice bad" role="alert">
          {t.signIn[state.error]}
        </p>
      ) : null}

      <label htmlFor="email">{t.common.email}</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        required
      />

      <label htmlFor="password">{t.common.password}</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      <button type="submit" disabled={pending}>
        {pending ? t.common.loading : t.signIn.submit}
      </button>

      <p style={{ margin: 0 }}>
        <Link href="/forgot-password">{t.signIn.forgot}</Link>
      </p>
    </form>
  );
}
