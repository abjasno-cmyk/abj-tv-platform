import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";

import { OpinionDetail } from "@/components/nazory/OpinionDetail";
import { SITE_URL } from "@/lib/site";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { isNazoryAdmin } from "@/lib/nazory/access";
import { getPublicAuthorBySlug } from "@/lib/nazory/authors";
import { getPublishedArticleBySlug } from "@/lib/nazory/articles";
import { LOCALE_EN } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/server";
import { localizedPath } from "@/lib/i18n/paths";
import { getOpinionArticleDisplay } from "@/lib/nazory/englishOriginal";
import { localizePublicAuthorProfile } from "@/lib/nazory/authorLocalization";
import { translateAndStoreOpinionArticle } from "@/lib/nazory/autoTranslation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const supabase = await createSupabaseServerClient();
  const article = await getPublishedArticleBySlug(supabase, slug);
  if (!article) return { title: "Článek nenalezen — Názory" };

  const displayArticle = getOpinionArticleDisplay(article, locale);
  const title = locale === "en" ? `${displayArticle.title} — Opinions` : article.seo_title ?? `${displayArticle.title} — Názory`;
  const description = locale === "en" ? displayArticle.perex : article.seo_description ?? displayArticle.perex;
  return {
    title,
    description,
    openGraph: {
      title,
      description: description ?? undefined,
      type: "article",
      publishedTime: article.published_at ?? undefined,
      url: `${SITE_URL}${localizedPath(locale, `/nazory/${article.slug}`)}`,
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

  if (locale === LOCALE_EN) {
    after(async () => {
      await translateAndStoreOpinionArticle(createSupabaseServiceClient(), article).catch((translationError) => {
        console.error("Opinion auto-translation after EN article render failed", translationError);
      });
    });
  }

  return (
    <div className="vx-live vx-sub nazory-page">
      <OpinionDetail
        article={article}
        author={localizedAuthor}
        shareUrl={`${SITE_URL}${localizedPath(locale, `/nazory/${article.slug}`)}`}
        commentCount={count ?? 0}
        editHref={editHref}
        locale={locale}
      />
    </div>
  );
}
