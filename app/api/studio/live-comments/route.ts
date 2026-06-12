import { NextResponse } from "next/server";

import { hasStudioCapability, resolveStudioAccessContext } from "@/lib/studio/access";
import {
  loadLiveCommentBoard,
  resolveLiveCommentsVideoContext,
  splitLiveCommentsByQuestion,
} from "@/lib/studio/liveComments";
import { canModerateViewerComments } from "@/lib/viewer/commentAccess";

export const dynamic = "force-dynamic";

function normalize(value: string | null): string {
  return (value ?? "").trim();
}

export async function GET(request: Request) {
  const access = await resolveStudioAccessContext();

  if (!access.user) {
    return NextResponse.json({ error: "Pro přístup se přihlaste přes Google." }, { status: 401 });
  }

  if (!access.canAccessStudio) {
    return NextResponse.json({ error: "Tato stránka je dostupná pouze pro schválené studio účty." }, { status: 403 });
  }

  if (!hasStudioCapability(access, "comments_moderate")) {
    return NextResponse.json({ error: "Nemáte oprávnění moderovat komentáře." }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestedVideoId = normalize(url.searchParams.get("videoId"));
  let videoContext = await resolveLiveCommentsVideoContext(requestedVideoId || null);

  if (videoContext && !videoContext.title) {
    const { data } = await access.supabase
      .from("videos")
      .select("title, channel_name")
      .eq("video_id", videoContext.videoId)
      .maybeSingle();
    if (data) {
      const row = data as { title?: string | null; channel_name?: string | null };
      videoContext = {
        ...videoContext,
        title: row.title?.trim() || videoContext.title,
        channel: row.channel_name?.trim() || videoContext.channel,
      };
    }
  }

  if (!videoContext) {
    return NextResponse.json({
      video: null,
      comments: [],
      questions: [],
      other: [],
      counts: { total: 0, questions: 0, other: 0 },
      refreshedAt: new Date().toISOString(),
      needsVideo: true,
    });
  }

  try {
    const viewerCanModerate = await canModerateViewerComments(access.supabase, access.user);
    const comments = await loadLiveCommentBoard({
      supabase: access.supabase,
      videoId: videoContext.videoId,
      viewerCanModerate,
    });
    const { questions, other } = splitLiveCommentsByQuestion(comments);

    return NextResponse.json({
      video: videoContext,
      comments,
      questions,
      other,
      counts: {
        total: comments.length,
        questions: questions.length,
        other: other.length,
      },
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("live-comments fetch failed", error);
    return NextResponse.json({ error: "Načtení komentářů selhalo." }, { status: 500 });
  }
}
