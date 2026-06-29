import { AdminNovinyDashboard } from "@/app/admin/noviny/AdminNovinyDashboard";
import { requireNovinyAdminPage } from "@/app/admin/noviny/access";

export const dynamic = "force-dynamic";

export default async function AdminNovinyPage() {
  await requireNovinyAdminPage();
  return <AdminNovinyDashboard />;
}
