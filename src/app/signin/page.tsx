import { redirect } from "next/navigation";
import { getText } from "@/i18n/server";
import { currentUser } from "@/lib/auth/guard";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const user = await currentUser();
  if (user !== null) {
    redirect("/");
  }

  const t = await getText();
  const { callbackUrl } = await searchParams;

  // Only ever redirect back inside this application, never to another website.
  const safeCallback =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/";

  return (
    <main className="narrow">
      <h1>{t.signIn.title}</h1>
      <p className="lede">{t.signIn.lede}</p>

      <div className="card">
        <SignInForm t={t} callbackUrl={safeCallback} />
      </div>
    </main>
  );
}
