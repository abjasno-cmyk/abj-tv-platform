import { redirect } from "next/navigation";

import { OpinionEditor } from "@/components/nazory/OpinionEditor";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthorWithCompletedProfile } from "@/lib/nazory/access";
import { getAuthorProfileByUserId } from "@/lib/nazory/authors";

export const dynamic = "force-dynamic";

export default async function NazoryWritePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/nazory/profil");
  }

  try {
    await requireAuthorWithCompletedProfile(supabase, user);
  } catch {
    redirect("/nazory/profil");
  }

  const profile = await getAuthorProfileByUserId(supabase, user.id);
  if (!profile?.profile_completed) {
    redirect("/nazory/profil");
  }

  return (
    <div className="vx-live vx-sub nazory-page">
      <h1 className="section-h">NAPSAT ČLÁNEK</h1>
      <OpinionEditor />
    </div>
  );
}
