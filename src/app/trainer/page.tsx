import { AreaPage } from "@/components/area-page";
import { getText } from "@/i18n/server";
import { PATHS, requireAccess } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export default async function TrainerPage() {
  const user = await requireAccess(PATHS.trainer);
  const t = await getText();

  return (
    <AreaPage
      title={t.pages.trainerTitle}
      lede={t.pages.trainerLede}
      t={t}
      user={user}
    />
  );
}
