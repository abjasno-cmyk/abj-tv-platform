import { requireNovinyAdminPage } from "@/app/admin/noviny/access";
import { NovinySourcesAdminClient } from "@/app/admin/noviny/zdroje/NovinySourcesAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminNovinySourcesPage() {
  await requireNovinyAdminPage();
  return <NovinySourcesAdminClient />;
}
