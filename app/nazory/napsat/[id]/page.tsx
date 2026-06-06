import Link from "next/link";
import { redirect } from "next/navigation";

import { OpinionEditor } from "@/components/nazory/OpinionEditor";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getArticleById, getArticleByIdForAuthor } from "@/lib/nazory/articles";
import { getAuthorProfileByUserId } from "@/lib/nazory/authors";
import { isNazoryAdmin, requireAuthorWithCompletedProfile } from "@/lib/nazory/access";
import { getAuthorDisplayName } from "@/lib/nazory/display";

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

  const admin = await isNazoryAdmin(supabase, user);
  if (!admin) {
    try {
      await requireAuthorWithCompletedProfile(supabase, user);
    } catch {
      redirect("/nazory/profil");
    }
  }
  const article = admin
    ? await getArticleById(supabase, id)
    : await getArticleByIdForAuthor(supabase, id, user.id);
  if (!article || article.deleted_at) {
    redirect("/nazory/napsat");
  }

  const editingAsAdmin = admin && article.author_id !== user.id;
  const managedAuthor = editingAsAdmin ? await getAuthorProfileByUserId(supabase, article.author_id) : null;

  return (
    <div className="vx-live vx-sub nazory-page">
      {editingAsAdmin && managedAuthor ? (
        <p className="nazory-author-link">
          <Link href={`/autori/${article.author_id}#clanky`}>
            ← Zpět k článkům autora {getAuthorDisplayName(managedAuthor)}
          </Link>
        </p>
      ) : null}
      <h1 className="section-h">{article.status === "published" ? "UPRAVIT ČLÁNEK" : "UPRAVIT KONCEPT"}</h1>
      <OpinionEditor
        articleId={article.id}
        initialTitle={article.title}
        initialPerex={article.perex}
        initialContent={article.content_json}
        initialStatus={article.status}
        publishedSlug={article.status === "published" ? article.slug : null}
      />
    </div>
  );
}
