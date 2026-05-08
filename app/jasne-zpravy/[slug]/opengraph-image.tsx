import { ImageResponse } from "next/og";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Jasné zprávy — ABJ";

const EDITION_TYPE_LABEL: Record<string, string> = {
  morning: "Ranní vydání",
  noon: "Polední vydání",
  evening: "Večerní vydání",
  manual: "Mimořádné vydání",
};

function formatPragueDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("cs-CZ", {
      timeZone: "Europe/Prague",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default async function OpengraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = await createSupabaseServerClient();
  const { data: edition } = await supabase
    .from("news_editions")
    .select("title, subtitle, edition_type, published_at, generated_at")
    .eq("slug", params.slug)
    .eq("status", "published")
    .maybeSingle();

  const title = edition?.title ?? "Jasné zprávy";
  const subtitle = edition?.subtitle ?? "";
  const typeLabel = edition
    ? EDITION_TYPE_LABEL[edition.edition_type] ?? edition.edition_type
    : "";
  const dateLabel = edition
    ? formatPragueDate(edition.published_at ?? edition.generated_at)
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 70px",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: "#dc2626", letterSpacing: -1 }}>
            ABJ
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 4, color: "#888" }}>
            JASNÉ ZPRÁVY
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {(typeLabel || dateLabel) && (
            <div style={{ display: "flex", gap: 16, fontSize: 22, color: "#dc2626", fontWeight: 700 }}>
              {typeLabel && <span>{typeLabel}</span>}
              {typeLabel && dateLabel && <span style={{ color: "#444" }}>·</span>}
              {dateLabel && <span style={{ color: "#aaa", fontWeight: 500 }}>{dateLabel}</span>}
            </div>
          )}
          <div
            style={{
              fontSize: title.length > 80 ? 52 : 64,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: -1.5,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 28, color: "#bbb", lineHeight: 1.3, marginTop: 4 }}>
              {subtitle.length > 140 ? `${subtitle.slice(0, 140)}…` : subtitle}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 18,
            color: "#666",
            borderTop: "1px solid #2a2a2a",
            paddingTop: 24,
          }}
        >
          <span>abjasno.cz</span>
          <span style={{ letterSpacing: 2 }}>NEZÁVISLÁ ŽURNALISTIKA</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
