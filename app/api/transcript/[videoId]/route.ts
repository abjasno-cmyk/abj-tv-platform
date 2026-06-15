import { fetchVideoTranscriptServer, TranscriptProviderError } from "@/lib/transcriptFetchServer";
import type { TranscriptResponse } from "@/lib/transcriptTypes";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ videoId: string }> | { videoId: string };
};

async function resolveVideoId(context: RouteContext): Promise<string | null> {
  const resolved = await Promise.resolve(context.params);
  const raw = resolved.videoId?.trim();
  if (!raw || !/^[A-Za-z0-9_-]{11}$/.test(raw)) return null;
  return raw;
}

export async function GET(request: Request, context: RouteContext) {
  const videoId = await resolveVideoId(context);
  if (!videoId) {
    return Response.json({ error: "Invalid video id." }, { status: 400 });
  }

  let payload: TranscriptResponse | null;
  try {
    payload = await fetchVideoTranscriptServer(videoId, request);
  } catch (error) {
    if (error instanceof TranscriptProviderError) {
      if (error.code === "provider_config_missing") {
        return Response.json({ error: "Transcript provider is not configured." }, { status: 503 });
      }
      if (error.code === "provider_auth_failed") {
        return Response.json({ error: "Transcript provider authorization failed." }, { status: 503 });
      }
      return Response.json({ error: "Transcript provider is unavailable." }, { status: 502 });
    }
    return Response.json({ error: "Transcript request failed." }, { status: 502 });
  }

  if (!payload) {
    return Response.json(
      {
        video_id: videoId,
        status: "unavailable",
        transcript: null,
        transcript_at: null,
        transcript_original: null,
        source_lang: null,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  }

  return Response.json(payload, {
    status: 200,
    headers: {
      "Cache-Control":
        payload.status === "ready"
          ? "public, s-maxage=300, stale-while-revalidate=1800"
          : "no-store, max-age=0",
    },
  });
}
