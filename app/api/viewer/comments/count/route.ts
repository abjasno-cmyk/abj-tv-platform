import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseSchemaMismatch } from "@/lib/viewer/commentsDb";

export const dynamic = "force-dynamic";

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entityType = normalizeString(url.searchParams.get("entityType"));
  const entityId = normalizeString(url.searchParams.get("entityId"));

  if (!entityType || !entityId) {
    return Response.json(
      { error: "entityType a entityId jsou povinné.", count: 0, schemaReady: false },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const countQuery = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("status", "published");

    if (countQuery.error) {
      if (isSupabaseSchemaMismatch(countQuery.error)) {
        return Response.json({ count: 0, schemaReady: false, entityType, entityId });
      }
      return Response.json(
        { error: "Počet komentářů se nepodařilo načíst.", count: 0, schemaReady: true },
        { status: 500 },
      );
    }

    return Response.json({
      entityType,
      entityId,
      count: countQuery.count ?? 0,
      schemaReady: true,
    });
  } catch {
    return Response.json(
      { error: "Počet komentářů se nepodařilo načíst.", count: 0, schemaReady: true },
      { status: 500 },
    );
  }
}
