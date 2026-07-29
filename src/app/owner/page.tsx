import { AreaPage } from "@/components/area-page";
import { getText } from "@/i18n/server";
import { PATHS, requireAccess } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export default async function OwnerPage() {
  const user = await requireAccess(PATHS.owner);
  const t = await getText();

  return (
    <AreaPage
      title={t.pages.ownerTitle}
      lede={t.pages.ownerLede}
      t={t}
      user={user}
    />
  );
}
