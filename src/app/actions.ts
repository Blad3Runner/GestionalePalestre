"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { requestPasswordReset, completePasswordReset } from "@/lib/auth/password-reset";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/locale";

/**
 * Everything the sign-in screens do on the server.
 *
 * Each returns a small result object that the form turns into a message, so no error
 * text is ever written into the page directly — it all comes from the dictionaries.
 */

export type SignInState = { error: "failed" | "missingFields" | null };

export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/");

  if (email === "" || password === "") {
    return { error: "missingFields" };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
  } catch (error) {
    if (error instanceof AuthError) {
      // Deliberately one message for every kind of failure.
      return { error: "failed" };
    }
    // A successful sign-in throws a redirect, which must travel on untouched.
    throw error;
  }

  return { error: null };
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export type ForgotState = { sent: boolean };

export async function forgotPasswordAction(
  _previous: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim();
  const baseUrl = String(formData.get("baseUrl") ?? "http://localhost:3000");

  if (email !== "") {
    await requestPasswordReset(email, baseUrl);
  }

  // Always the same answer, whether or not that address has an account.
  return { sent: true };
}

export type ResetState = {
  status: "idle" | "done";
  error: "invalidToken" | "mismatch" | "tooShort" | "tooLong" | null;
};

export async function resetPasswordAction(
  _previous: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password !== confirm) {
    return { status: "idle", error: "mismatch" };
  }

  const outcome = await completePasswordReset(token, password);

  if (outcome.ok) {
    return { status: "done", error: null };
  }

  const errors = {
    "invalid-token": "invalidToken",
    "too-short": "tooShort",
    "too-long": "tooLong",
  } as const;

  return { status: "idle", error: errors[outcome.reason] };
}

export async function setLocaleAction(formData: FormData): Promise<void> {
  const locale = resolveLocale(formData.get("locale"));
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
