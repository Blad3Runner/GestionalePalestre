import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { getLocale } from "@/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestionale Palestre",
  description: "Multi-tenant platform for managing training businesses",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Italian is the platform default (docs/decisions.md, 2026-07-29); the visitor's own
  // choice, or the language saved on their account, wins over it.
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
