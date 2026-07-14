import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OpinionDetail } from "@/components/nazory/OpinionDetail";
import { SITE_URL } from "@/lib/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isNazoryAdmin } from "@/lib/nazory/access";
import { getPublicAuthorBySlug } from "@/lib/nazory/authors";
import { getPublishedArticleBySlug } from "@/lib/nazory/articles";
import { getRequestLocale } from "@/lib/i18n/server";
import { localizePublicAuthorProfile } from "@/lib/nazory/authorLocalization";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const article = await getPublishedArticleBySlug(supabase, slug);
  if (!article) return { title: "Článek nenalezen — Názory" };

  const title = article.seo_title ?? `${article.title} — Názory`;
  const description = article.seo_description ?? article.perex;
  return {
    title,
    description,
    openGraph: {
      title,
      description: description ?? undefined,
      type: "article",
      publishedTime: article.published_at ?? undefined,
      url: `${SITE_URL}/nazory/${article.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description ?? undefined,
    },
  };
}

export default async function NazoryArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const supabase = await createSupabaseServerClient();
  const article = await getPublishedArticleBySlug(supabase, slug);
  if (!article) notFound();

  const authorRow = await supabase
    .from("author_profiles")
    .select("slug")
    .eq("user_id", article.author_id)
    .maybeSingle();
  const author = authorRow.data?.slug
    ? await getPublicAuthorBySlug(supabase, authorRow.data.slug)
    : null;
  if (!author) notFound();

  const { count } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("entity_type", "opinion")
    .eq("entity_id", article.id)
    .eq("status", "published");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = user ? await isNazoryAdmin(supabase, user) : false;
  const canEdit = Boolean(user && (admin || user.id === article.author_id));
  const editHref = canEdit ? `/nazory/napsat/${article.id}` : null;
  const localizedAuthor = await localizePublicAuthorProfile(author, locale);

  return (
    <div className="vx-live vx-sub nazory-page">
      <OpinionDetail
        article={article}
        author={localizedAuthor}
        shareUrl={`${SITE_URL}/nazory/${article.slug}`}
        commentCount={count ?? 0}
        editHref={editHref}
        locale={locale}
      />
    </div>
  );
}
