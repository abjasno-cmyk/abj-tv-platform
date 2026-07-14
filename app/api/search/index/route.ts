import { isCronAuthorized } from "@/lib/cronAuth";
import { runUnifiedSearchIndex } from "@/lib/search/unifiedSearch";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? process.env.VEROX_SEARCH_INDEX_LIMIT ?? 40);
  const safeLimit = Math.max(1, Math.min(100, Number.isFinite(limit) ? limit : 40));

  try {
    const report = await runUnifiedSearchIndex(safeLimit);
    return Response.json({
      ok: report.errors.length === 0,
      warning: report.errors.length > 0 ? "Indexace doběhla jen částečně." : null,
      ...report,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Search index failed" },
      { status: 500 },
    );
  }
}
