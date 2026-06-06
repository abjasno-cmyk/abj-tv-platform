import { redirect } from "next/navigation";

import { NazoryAdmin } from "@/components/nazory/NazoryAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isNazoryAdmin } from "@/lib/nazory/access";

export const dynamic = "force-dynamic";

export default async function NazoryAdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isNazoryAdmin(supabase, user))) {
    redirect("/nazory");
  }

  return (
    <div className="vx-live vx-sub nazory-page">
      <h1 className="section-h">SPRÁVA NÁZORŮ</h1>
      <NazoryAdmin />
    </div>
  );
}
