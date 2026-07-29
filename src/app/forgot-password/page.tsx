import { headers } from "next/headers";
import { getText } from "@/i18n/server";
import { ForgotForm } from "./forgot-form";

export default async function ForgotPasswordPage() {
  const t = await getText();

  const incoming = await headers();
  const host = incoming.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";

  return (
    <main className="narrow">
      <h1>{t.forgot.title}</h1>
      <p className="lede">{t.forgot.lede}</p>

      <div className="card">
        <ForgotForm t={t} baseUrl={`${protocol}://${host}`} />
      </div>
    </main>
  );
}
