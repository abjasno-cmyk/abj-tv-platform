import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Smazání účtu a osobních údajů | VEROX",
  description: "Postup žádosti o smazání účtu a osobních údajů na platformě VEROX.",
};

export default function DataDeletionPage() {
  return (
    <LegalPageLayout title="Smazání účtu a osobních údajů">
      <p>
        Tato stránka vysvětluje, jak můžete požádat o smazání svého účtu a osobních údajů z platformy VEROX.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">Jak požádat o smazání účtu</h2>
        <p>Pokud chcete smazat svůj účet VEROX, napište nám na e-mail:</p>
        <p>
          <a href="mailto:lipovska.hana@seznam.cz" className="text-[#FFB782] hover:text-[#FFD8BC]">
            lipovska.hana@seznam.cz
          </a>
        </p>
        <p>Do předmětu zprávy uveďte:</p>
        <p>Žádost o smazání účtu VEROX</p>
        <p>Do zprávy prosím napište:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>e-mailovou adresu, kterou jste použili při přihlášení,</li>
          <li>zda jste se přihlašovali přes Google, Facebook nebo e-mail,</li>
          <li>stručnou žádost o smazání účtu.</li>
        </ul>
        <p>Příklad:</p>
        <div className="rounded-lg border border-white/15 bg-white/5 p-3 text-sm leading-7 text-[#DCE2EE]">
          <p>Dobrý den,</p>
          <p>žádám o smazání svého účtu na platformě VEROX.</p>
          <p>K přihlášení jsem používal/a e-mail: [váš e-mail].</p>
          <p>Přihlašoval/a jsem se přes: [Google / Facebook / e-mail].</p>
          <p>Děkuji.</p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">Co se po žádosti stane</h2>
        <p>
          Po ověření žádosti smažeme nebo anonymizujeme osobní údaje spojené s vaším účtem, zejména:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>profil účtu,</li>
          <li>přihlašovací údaje uložené v rámci platformy,</li>
          <li>uložené preference,</li>
          <li>oblíbené kanály,</li>
          <li>historii sledování,</li>
          <li>rozkoukaná videa,</li>
          <li>lajky,</li>
          <li>další údaje spojené s vaším účtem.</li>
        </ul>
        <p>
          Komentáře mohou být podle okolností smazány, anonymizovány nebo ponechány bez vazby na váš osobní profil,
          zejména pokud je to nezbytné pro zachování srozumitelnosti diskuse, ochranu právních nároků, bezpečnost
          platformy nebo výkon svobody projevu.
        </p>
        <p>
          GDPR dává jednotlivcům právo požádat o výmaz osobních údajů, ale současně existují případy, kdy organizace
          nemusí některé údaje odstranit, například pokud je jejich uchování potřebné pro výkon svobody projevu nebo pro
          splnění právní povinnosti.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">Lhůta pro vyřízení</h2>
        <p>Žádost vyřídíme v přiměřené lhůtě v souladu s právními předpisy.</p>
        <p>
          Pokud budeme potřebovat ověřit, že žádost skutečně podává vlastník účtu, můžeme vás požádat o doplnění
          informací. Nebudeme po vás požadovat heslo.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">Přihlášení přes Google nebo Facebook</h2>
        <p>
          Smazání účtu na platformě VEROX neznamená smazání vašeho účtu Google nebo Facebook.
        </p>
        <p>
          Pokud chcete spravovat oprávnění udělená platformě VEROX ve svém Google nebo Facebook účtu, proveďte to přímo
          v nastavení svého účtu u dané služby.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">Kontakt</h2>
        <p>Pro žádosti o smazání účtu nebo dotazy k osobním údajům použijte:</p>
        <p>
          <a href="mailto:lipovska.hana@seznam.cz" className="text-[#FFB782] hover:text-[#FFD8BC]">
            lipovska.hana@seznam.cz
          </a>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">Datum poslední aktualizace</h2>
        <p>20. května 2026</p>
      </section>
    </LegalPageLayout>
  );
}
