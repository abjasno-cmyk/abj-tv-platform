import { ImageResponse } from "next/og";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublishedArticleBySlug } from "@/lib/nazory/articles";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const article = await getPublishedArticleBySlug(supabase, slug);
  const title = article?.title ?? "Názory";
  const perex = article?.perex ?? "Autorský článek na VEROX";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #171411 0%, #3a2418 55%, #ff6a00 100%)",
          color: "#ffffff",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 4, textTransform: "uppercase", opacity: 0.9 }}>Názory</div>
        <div>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, marginBottom: 24 }}>{title}</div>
          <div style={{ fontSize: 30, lineHeight: 1.4, opacity: 0.92 }}>{perex.slice(0, 180)}</div>
        </div>
        <div style={{ fontSize: 24, opacity: 0.85 }}>VEROX • Mainstreamový detox</div>
      </div>
    ),
    { ...size },
  );
}
