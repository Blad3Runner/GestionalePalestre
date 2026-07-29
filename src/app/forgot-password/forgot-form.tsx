"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, type ForgotState } from "@/app/actions";
import type { Dictionary } from "@/i18n/dictionaries";

const initial: ForgotState = { sent: false };

export function ForgotForm({ t, baseUrl }: { t: Dictionary; baseUrl: string }) {
  const [state, action, pending] = useActionState(forgotPasswordAction, initial);

  if (state.sent) {
    return (
      <>
        <p className="notice ok">{t.forgot.sent}</p>
        <p style={{ margin: 0 }}>
          <Link href="/signin">{t.forgot.backToSignIn}</Link>
        </p>
      </>
    );
  }

  return (
    <form action={action} className="stack">
      <input type="hidden" name="baseUrl" value={baseUrl} />

      <label htmlFor="email">{t.common.email}</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        required
      />

      <button type="submit" disabled={pending}>
        {pending ? t.common.loading : t.forgot.submit}
      </button>

      <p style={{ margin: 0 }}>
        <Link href="/signin">{t.forgot.backToSignIn}</Link>
      </p>
    </form>
  );
}
