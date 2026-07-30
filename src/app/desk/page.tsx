import { AreaPage } from "@/components/area-page";
import { getText } from "@/i18n/server";
import { PATHS, requireAccess } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export default async function DeskPage() {
  const user = await requireAccess(PATHS.desk);
  const t = await getText();

  return (
    <AreaPage
      title={t.pages.deskTitle}
      lede={t.pages.deskLede}
      t={t}
      user={user}
      links={[{ href: "/desk/members", label: t.members.title }]}
    />
  );
}
