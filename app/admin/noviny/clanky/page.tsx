import { requireNovinyAdminPage } from "@/app/admin/noviny/access";
import { NovinyArticlesAdminClient } from "@/app/admin/noviny/clanky/NovinyArticlesAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminNovinyArticlesPage() {
  await requireNovinyAdminPage();
  return <NovinyArticlesAdminClient />;
}
