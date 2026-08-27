import type { Metadata } from "next";

// Sirotčí stránka s AI anotacemi bez označení (AI Act čl. 50(4)) —
// neindexovat, dokud se nerozhodne produktově a nedoplní AI štítky.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProgramLayout({ children }: { children: React.ReactNode }) {
  return children;
}
