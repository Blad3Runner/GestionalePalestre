/**
 * Sending email.
 *
 * ⚠ NOT YET CONNECTED TO ANYTHING. No transactional email provider has been chosen —
 * see the open question at the end of docs/decisions.md. Choosing one is a real
 * decision (cost, EU hosting, GDPR), so it was not invented here.
 *
 * Until then every message is written to the terminal where `npm run dev` is running,
 * which is enough to build and test the whole password-reset flow. When a provider is
 * chosen, only this one file changes.
 */

export type Email = {
  to: string;
  subject: string;
  body: string;
};

export async function sendEmail(message: Email): Promise<void> {
  // eslint-disable-next-line no-console
  console.info(
    [
      "",
      "┌───────────────────────────────────────────────────────────────",
      "│ EMAIL NOT SENT — no provider configured yet.",
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

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
): Promise<void> {
  await sendEmail({
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
