import Link from "next/link";

import { LOCALE_CS, type VeroxLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export function LegalFooter({ locale = LOCALE_CS }: { locale?: VeroxLocale }) {
  const dictionary = getDictionary(locale);

  return (
    <footer className="border-t border-[rgba(17,17,17,0.1)] bg-white/95 px-4 py-3">
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
