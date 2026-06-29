import "server-only";

import { redirect } from "next/navigation";

import { isNazoryAdmin } from "@/lib/nazory/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireNovinyAdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isNazoryAdmin(supabase, user))) {
    redirect("/noviny");
  }
}
