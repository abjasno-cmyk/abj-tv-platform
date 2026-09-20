import { fetchFirstUpstream, resolveFeedApiKey, buildAdsUrlCandidates } from "@/lib/programFeedProxy";

export const dynamic = "force-dynamic";

const MEDIA_NAME = /^[a-f0-9]{16}\.(jpg|jpeg|png|webp|gif)$/i;

function mediaCandidates(name: string): string[] {
  return buildAdsUrlCandidates().map((url) => url.replace(/\/ads\/?$/, `/ads/media/${name}`));
}

export async function GET(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  if (!MEDIA_NAME.test(name)) {
    return new Response("Not found", { status: 404 });
  }
  const apiKey = resolveFeedApiKey();
  if (!apiKey) {
    return new Response("Not found", { status: 404 });
  }
  const candidates = mediaCandidates(name);
  if (candidates.length === 0) {
    return new Response("Not found", { status: 404 });
  }
  const { response } = await fetchFirstUpstream(candidates, request, apiKey);
  if (!response || !response.ok) {
    return new Response("Not found", { status: 404 });
  }
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const body = await response.arrayBuffer();
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
