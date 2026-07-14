import { searchVerox, type VeroxSearchContentType } from "@/lib/search/unifiedSearch";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set<VeroxSearchContentType>(["video", "video_transcript", "zpravy", "nazory"]);

function parseTypes(value: string | null): VeroxSearchContentType[] | null {
  if (!value) return null;
  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is VeroxSearchContentType => ALLOWED_TYPES.has(item as VeroxSearchContentType));
  return parsed.length > 0 ? parsed : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const limit = Number(url.searchParams.get("limit") ?? 20);

  if (query.length > 160) {
    return Response.json({ error: "Dotaz je příliš dlouhý." }, { status: 400 });
  }

  try {
    const result = await searchVerox({
      query,
      limit: Number.isFinite(limit) ? limit : 20,
      contentTypes: parseTypes(url.searchParams.get("types")),
    });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Vyhledávání selhalo." },
      { status: 500 },
    );
  }
}
