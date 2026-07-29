import Link from "next/link";
import { getText } from "@/i18n/server";
import { ResetForm } from "./reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getText();
  const { token } = await searchParams;

  return (
    <main className="narrow">
      <h1>{t.reset.title}</h1>
      <p className="lede">{t.reset.lede}</p>

      <div className="card">
        {token ? (
          <ResetForm t={t} token={token} />
        ) : (
          <>
            <p className="notice bad">{t.reset.invalidToken}</p>
            <p style={{ margin: 0 }}>
              <Link href="/forgot-password">{t.forgot.title}</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
