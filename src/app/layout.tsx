import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestionale Palestre",
  description: "Multi-tenant platform for managing training businesses",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Italian is the default language of the platform (decisions.md, 2026-07-29).
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
