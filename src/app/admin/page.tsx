import { AreaPage } from "@/components/area-page";
import { getText } from "@/i18n/server";
import { PATHS, requireAccess } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // The real lock: refuses on the server before anything is rendered.
  const user = await requireAccess(PATHS.admin);
  const t = await getText();

  return (
    <AreaPage
      title={t.pages.adminTitle}
      lede={t.pages.adminLede}
      t={t}
      user={user}
    />
  );
}
