import { fetchFirstUpstream, resolveFeedApiKey, buildAdsUrlCandidates } from "@/lib/programFeedProxy";
import { parseAdsPayload } from "@/lib/ads/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiKey = resolveFeedApiKey();
  if (!apiKey) {
    return Response.json({ items: [] }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
  const candidates = buildAdsUrlCandidates();
  if (candidates.length === 0) {
    return Response.json({ items: [] }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
  const { response } = await fetchFirstUpstream(candidates, request, apiKey);
  if (!response || !response.ok) {
    return Response.json({ items: [] }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const payload = (await response.json()) as unknown;
    return Response.json(
      { items: parseAdsPayload(payload) },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return Response.json({ items: [] }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
