import { isCronAuthorized } from "@/lib/cronAuth";
import { runUnifiedSearchIndex } from "@/lib/search/unifiedSearch";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 80);

  try {
    const report = await runUnifiedSearchIndex(Number.isFinite(limit) ? limit : 80);
    return Response.json({ ok: true, ...report });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Search index failed" },
      { status: 500 },
    );
  }
}
