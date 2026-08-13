import Link from "next/link";

import { LOCALE_CS, type VeroxLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export function LegalFooter({ locale = LOCALE_CS }: { locale?: VeroxLocale }) {
  const dictionary = getDictionary(locale);

  return (
    <footer className="border-t border-[rgba(17,17,17,0.1)] bg-white/95 px-4 py-3">
      {/* Popis služby a účelu přihlášení — vyžaduje Google OAuth verifikace
          (home page must explain the purpose of your app + app name match). */}
      <p className="mx-auto mb-2 w-full max-w-6xl text-center text-[11px] leading-relaxed text-abj-text2">
        VEROX je internetová televize — živé vysílání, videa a souhrny z nezávislých kanálů na
        jednom místě. Přihlášení (e-mailem či přes Google) slouží k vytvoření bezplatného
        diváckého účtu: komentáře, oblíbené pořady a pokračování ve sledování.
      </p>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-2 text-[11px] text-abj-text2">
        <Link href="/privacy" className="hover:text-abj-text1">
          {dictionary.footer.privacy}
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms" className="hover:text-abj-text1">
          {dictionary.footer.terms}
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/data-deletion" className="hover:text-abj-text1">
          {dictionary.footer.dataDeletion}
        </Link>
      </div>
    </footer>
  );
}
