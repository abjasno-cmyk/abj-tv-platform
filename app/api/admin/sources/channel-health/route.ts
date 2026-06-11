import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireWallAdmin } from "@/lib/wallAdminAuth";

export const dynamic = "force-dynamic";

type ChannelLinkType = "channel-id" | "handle" | "username" | "custom" | "unknown";
type SourceHealthIssue = "missing_channel_id" | "missing_channel_url" | "missing_uploads_playlist_id";

type SourceHealthRow = {
  id: string;
  sourceName: string;
  channelId: string | null;
  channelUrl: string | null;
  uploadsPlaylistId: string | null;
  linkType: ChannelLinkType;
  linkIdentifier: string | null;
  issues: SourceHealthIssue[];
  needsAttention: boolean;
};

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseChannelLink(channelUrl: string | null): { linkType: ChannelLinkType; linkIdentifier: string | null } {
  if (!channelUrl) return { linkType: "unknown", linkIdentifier: null };
  try {
    const parsed = new URL(channelUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return { linkType: "unknown", linkIdentifier: null };

    const [first, second] = parts;
    if (first.startsWith("@")) {
      return { linkType: "handle", linkIdentifier: first.slice(1) || null };
    }
    if (first === "channel" && second) {
      return { linkType: "channel-id", linkIdentifier: second };
    }
    if (first === "user" && second) {
      return { linkType: "username", linkIdentifier: second };
    }
    if (first === "c" && second) {
      return { linkType: "custom", linkIdentifier: second };
    }
    return { linkType: "unknown", linkIdentifier: first || null };
  } catch {
    return { linkType: "unknown", linkIdentifier: null };
  }
}

export async function GET(request: Request) {
  const auth = requireWallAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("sources")
      .select("id, source_name, channel_id, channel_url, uploads_playlist_id")
      .eq("platform", "youtube")
      .eq("active", true)
      .order("source_name", { ascending: true });

    if (error) {
      return Response.json({ error: `Načtení sources selhalo: ${error.message}` }, { status: 500 });
    }

    const rows = ((data ?? []) as Array<Record<string, unknown>>)
      .map((row): SourceHealthRow | null => {
        const id = readString(row.id);
        const sourceName = readString(row.source_name);
        if (!id || !sourceName) return null;
        const channelId = readString(row.channel_id);
        const channelUrl = readString(row.channel_url);
        const uploadsPlaylistId = readString(row.uploads_playlist_id);
        const { linkType, linkIdentifier } = parseChannelLink(channelUrl);
        const issues: SourceHealthIssue[] = [];
        if (!channelId) issues.push("missing_channel_id");
        if (!channelUrl) issues.push("missing_channel_url");
        if (!uploadsPlaylistId) issues.push("missing_uploads_playlist_id");
        return {
          id,
          sourceName,
          channelId,
          channelUrl,
          uploadsPlaylistId,
          linkType,
          linkIdentifier,
          issues,
          needsAttention: issues.length > 0,
        };
      })
      .filter((row): row is SourceHealthRow => Boolean(row))
      .sort((a, b) => {
        if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1;
        return a.sourceName.localeCompare(b.sourceName, "cs-CZ");
      });

    const summary = {
      total: rows.length,
      missingChannelId: rows.filter((row) => row.issues.includes("missing_channel_id")).length,
      missingChannelUrl: rows.filter((row) => row.issues.includes("missing_channel_url")).length,
      missingUploadsPlaylistId: rows.filter((row) => row.issues.includes("missing_uploads_playlist_id"))
        .length,
      healthy: rows.filter((row) => !row.needsAttention).length,
    };

    return Response.json({ rows, summary });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Neznámá chyba při načtení health reportu kanálů.",
      },
      { status: 500 }
    );
  }
}
