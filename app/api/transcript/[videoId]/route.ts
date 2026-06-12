import { fetchVideoTranscriptServer } from "@/lib/transcriptFetchServer";
import { isValidYouTubeVideoId } from "@/lib/viewer/videoPageServer";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ videoId: string }> | { videoId: string };
};

async function resolveVideoId(context: RouteContext): Promise<string | null> {
  const resolved = await Promise.resolve(context.params);
  const raw = resolved.videoId?.trim();
  if (!raw || !isValidYouTubeVideoId(raw)) return null;
  return raw;
}

export async function GET(request: Request, context: RouteContext) {
  const videoId = await resolveVideoId(context);
  if (!videoId) {
    return Response.json({ error: "Invalid video id." }, { status: 400 });
  }

  const payload = await fetchVideoTranscriptServer(videoId, request);
  if (!payload) {
    return Response.json(
      {
        video_id: videoId,
        status: "unavailable",
        transcript: null,
        transcript_at: null,
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
