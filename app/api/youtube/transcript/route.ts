import type { VideoTranscriptErrorPayload } from "@/lib/videoTranscriptTypes";
import { getVideoTranscript, isTranscriptError, parseVideoIdOrThrow } from "@/lib/videoTranscriptServer";

export const dynamic = "force-dynamic";

function buildErrorPayload(error: string, errorCode: VideoTranscriptErrorPayload["errorCode"]): VideoTranscriptErrorPayload {
  return {
    error,
    errorCode,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawVideoId = searchParams.get("videoId");
  const requestedLanguage = searchParams.get("lang");

  try {
    const videoId = parseVideoIdOrThrow(rawVideoId);
    const payload = await getVideoTranscript(videoId, requestedLanguage);
    return Response.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    if (isTranscriptError(error)) {
      return Response.json(buildErrorPayload(error.message, error.code), { status: error.status });
    }
    return Response.json(buildErrorPayload("Nepodařilo se načíst přepis videa.", "upstream_error"), {
      status: 500,
    });
  }
}
