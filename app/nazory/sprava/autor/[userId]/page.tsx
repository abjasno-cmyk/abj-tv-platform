import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminAuthorForm } from "@/components/nazory/AdminAuthorForm";
import { isNazoryAdmin } from "@/lib/nazory/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NazoryAdminAuthorPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isNazoryAdmin(supabase, user))) {
    redirect("/nazory");
  }

  return (
    <div className="vx-live vx-sub nazory-page">
      <p className="nazory-author-link">
        <Link href="/nazory/sprava">← Zpět na správu Názorů</Link>
      </p>
      <h1 className="section-h">SPRÁVA AUTORA</h1>
      <AdminAuthorForm userId={userId} />
    </div>
  );
}
