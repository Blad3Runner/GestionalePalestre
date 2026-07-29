import { AreaPage } from "@/components/area-page";
import { getText } from "@/i18n/server";
import { PATHS, requireAccess } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export default async function MemberPage() {
  const user = await requireAccess(PATHS.member);
  const t = await getText();

  return (
    <AreaPage
      title={t.pages.memberTitle}
      lede={t.pages.memberLede}
      t={t}
      user={user}
    />
  );
}
