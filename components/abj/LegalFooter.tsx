import Link from "next/link";

import { LOCALE_CS, type VeroxLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { TENANT } from "@/lib/tenant";

export function LegalFooter({ locale = LOCALE_CS }: { locale?: VeroxLocale }) {
  const dictionary = getDictionary(locale);

  return (
    <footer className="border-t border-[rgba(17,17,17,0.1)] bg-white/95 px-4 pb-4 pt-6">
      {/* Viditelný popis služby a účelu přihlášení — Google OAuth verifikace
          vyžaduje, aby homepage srozumitelně vysvětlila, co aplikace dělá
          (drobný text v patičce reviewerům nestačil). */}
      {TENANT.id === "verox" ? (
      <section className="mx-auto mb-5 w-full max-w-3xl text-center">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[#111111]">
          {dictionary.footer.aboutTitle}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[#3a3a3a]">{dictionary.footer.aboutText}</p>
      </section>
      ) : null}
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
