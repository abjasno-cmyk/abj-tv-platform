import Link from "next/link";

export function LegalFooter() {
  return (
    <footer className="border-t border-[rgba(17,17,17,0.1)] bg-white/95 px-4 py-3">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-2 text-[11px] text-abj-text2">
        <Link href="/privacy" className="hover:text-abj-text1">
          Ochrana osobních údajů
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms" className="hover:text-abj-text1">
          Podmínky užívání
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/data-deletion" className="hover:text-abj-text1">
          Smazání účtu
        </Link>
      </div>
    </footer>
  );
}
