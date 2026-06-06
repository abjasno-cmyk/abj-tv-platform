import { Fragment } from "react";

import { OpinionCard } from "@/components/nazory/OpinionCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthorDisplayName } from "@/lib/nazory/display";
import { publicNazoryMediaUrl } from "@/lib/nazory/media";
import type { AuthorProfileRow, OpinionArticleRow } from "@/lib/nazory/types";

async function loadAuthorsForArticles(articles: OpinionArticleRow[]) {
  const authorIds = [...new Set(articles.map((article) => article.author_id))];
  if (authorIds.length === 0) {
    return new Map<string, { name: string; avatarUrl: string | null }>();
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("author_profiles")
    .select("user_id, first_name, last_name, avatar_storage_path")
    .in("user_id", authorIds);

  const map = new Map<string, { name: string; avatarUrl: string | null }>();
  for (const row of (data ?? []) as Array<
    Pick<AuthorProfileRow, "user_id" | "first_name" | "last_name" | "avatar_storage_path">
  >) {
    map.set(row.user_id, {
      name: getAuthorDisplayName(row),
      avatarUrl: publicNazoryMediaUrl(row.avatar_storage_path),
    });
  }
  return map;
}

async function loadCommentCounts(articleIds: string[]) {
  if (articleIds.length === 0) return new Map<string, number>();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("comments")
    .select("entity_id")
    .eq("entity_type", "opinion")
    .eq("status", "published")
    .in("entity_id", articleIds);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ entity_id: string }>) {
    counts.set(row.entity_id, (counts.get(row.entity_id) ?? 0) + 1);
  }
  return counts;
}

export async function OpinionList({ articles }: { articles: OpinionArticleRow[] }) {
  const [authors, commentCounts] = await Promise.all([
    loadAuthorsForArticles(articles),
    loadCommentCounts(articles.map((article) => article.id)),
  ]);

  return (
    <>
      {articles.map((article, index) => (
        <Fragment key={article.id}>
          <OpinionCard
            article={article}
            author={authors.get(article.author_id) ?? null}
            commentCount={commentCounts.get(article.id) ?? 0}
          />
          {index < articles.length - 1 ? (
            <div className="vx-strip" aria-hidden="true">
              <span />
              <span />
            </div>
          ) : null}
        </Fragment>
      ))}
    </>
  );
}
