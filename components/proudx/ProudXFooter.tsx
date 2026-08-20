import Link from "next/link";

// Sdílená patička ProudX (live + videa). Provozovatel (POLYCONSULT) je uvedený
// v právních dokumentech, ne tady — patička nese jen brand a prokliky na ně.
export function ProudXFooter() {
  return (
    <footer className="px-foot">
      <span className="px-foot-brand">
        Proud<span>X</span>
      </span>
      <span className="px-foot-tag">Zůstaňte v proudu</span>
      <nav className="px-foot-links" aria-label="Právní informace">
        <Link href="/about">O ProudX</Link>
        <Link href="/terms">Podmínky užívání</Link>
        <Link href="/privacy">Ochrana soukromí</Link>
        <Link href="/data-deletion">Smazání dat</Link>
      </nav>
    </footer>
  );
}
