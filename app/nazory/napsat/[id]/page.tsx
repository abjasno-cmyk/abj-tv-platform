import { redirect } from "next/navigation";

import { OpinionEditor } from "@/components/nazory/OpinionEditor";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getArticleById, getArticleByIdForAuthor } from "@/lib/nazory/articles";
import { isNazoryAdmin, requireAuthorWithCompletedProfile } from "@/lib/nazory/access";

export const dynamic = "force-dynamic";

export default async function NazoryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const admin = await isNazoryAdmin(supabase, user);
  const article = admin
    ? await getArticleById(supabase, id)
    : await getArticleByIdForAuthor(supabase, id, user.id);
  if (!article || article.deleted_at) {
    redirect("/nazory/napsat");
  }

  return (
    <div className="vx-live vx-sub nazory-page">
      <h1 className="section-h">UPRAVIT KONCEPT</h1>
      <OpinionEditor
        articleId={article.id}
        initialTitle={article.title}
        initialPerex={article.perex}
        initialContent={article.content_json}
      />
    </div>
  );
}
