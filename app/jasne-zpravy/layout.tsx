import type { Metadata } from "next";

// AI generovaná zpravodajská vydání bez označení (AI Act čl. 50(4)); pipeline
// zastavená 29. 5. 2026 — celý strom /jasne-zpravy neindexovat. Platí i pro
// [slug] stránky: jejich generateMetadata robots nenastavuje, dědí se odsud.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function JasneZpravyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
