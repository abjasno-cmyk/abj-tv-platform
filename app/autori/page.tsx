import Link from "next/link";
import { redirect } from "next/navigation";

import { AutoriAdmin } from "@/components/autori/AutoriAdmin";
import { isNazoryAdmin } from "@/lib/nazory/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AutoriAdminPage() {
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
        <Link href="/nazory/sprava">Správa článků Názorů</Link>
        {" · "}
        <Link href="/nazory">Veřejné Názory</Link>
      </p>
      <h1 className="section-h">AUTOŘI</h1>
      <p className="nazory-form-lead">
        Soukromá správa autorských účtů. Přidávejte autory, spravujte jejich profily a články pod jejich jménem.
      </p>
      <AutoriAdmin />
    </div>
  );
}
