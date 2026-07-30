import { Resend } from "resend";

/**
 * Sending email, through Resend (docs/decisions.md, 2026-07-30).
 *
 * **Without `RESEND_API_KEY` set, messages are written to the terminal instead of being
 * sent.** That is deliberate: development and the test suite must never depend on an
 * external service, on network access, or on somebody's API key.
 *
 * Everything the system sends passes through this one file, so changing provider later
 * means changing nothing else.
 */

export type Email = {
  to: string;
  subject: string;
  body: string;
};

export type SendOutcome =
  | { sent: true; id: string | null }
  | { sent: false; reason: "no-api-key" | "rejected"; detail?: string };

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "Gestionale Palestre <onboarding@resend.dev>";
}

function logInstead(message: Email, why: string): void {
  console.info(
    [
      "",
      "┌───────────────────────────────────────────────────────────────",
      `│ EMAIL NOT SENT — ${why}`,
      "│ In the finished system this would arrive in the inbox.",
      "├───────────────────────────────────────────────────────────────",
      `│ To:      ${message.to}`,
      `│ Subject: ${message.subject}`,
      "│",
      ...message.body.split("\n").map((line) => `│ ${line}`),
      "└───────────────────────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}

export async function sendEmail(message: Email): Promise<SendOutcome> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey.trim() === "" || apiKey === "CHANGE_ME") {
    logInstead(message, "no RESEND_API_KEY configured");
    return { sent: false, reason: "no-api-key" };
  }

  try {
    const { data, error } = await new Resend(apiKey).emails.send({
      from: fromAddress(),
      to: message.to,
      subject: message.subject,
      text: message.body,
    });

    if (error) {
      // Never let a failure to send become a failure of the thing that triggered it:
      // a password reset must not appear broken because email is misconfigured.
      logInstead(message, `Resend rejected it: ${error.message}`);
      return { sent: false, reason: "rejected", detail: error.message };
    }

    return { sent: true, id: data?.id ?? null };
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    logInstead(message, `could not reach Resend: ${detail}`);
    return { sent: false, reason: "rejected", detail };
  }
}

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
): Promise<SendOutcome> {
  return sendEmail({
    to,
    subject: "Reimposta la tua password — Gestionale Palestre",
    body: [
      "Hai chiesto di reimpostare la password.",
      "",
      "Apri questo link per sceglierne una nuova (valido 1 ora):",
      resetLink,
      "",
      "Se non sei stato tu, ignora questo messaggio: la password resta invariata.",
    ].join("\n"),
  });
}
