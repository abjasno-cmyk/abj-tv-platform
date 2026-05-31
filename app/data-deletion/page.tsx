import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Smazání účtu a osobních údajů | VEROX",
  description: "Postup žádosti o smazání účtu a osobních údajů na platformě VEROX.",
};

export default function DataDeletionPage() {
  return (
    <main className="min-h-[calc(100vh-68px)] bg-[#FBF8F2] px-4 py-10 text-verox-ink md:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-9 border-b border-verox-line pb-6">
          <p className="vx-kicker text-verox-orangeDeep">VEROX · právní a informační servis</p>
          <h1
            className="vx-display mt-3 text-verox-ink"
            style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}
          >
            Smazání účtu a osobních údajů
          </h1>
          <hr className="vx-rule mt-5 h-[2px] w-full" />
        </header>

        <article className="jz-prose max-w-[70ch] space-y-6 text-[15px] leading-relaxed text-verox-charcoal md:text-base">
          <p>
            Tato stránka vysvětluje, jak můžete požádat o smazání svého účtu a osobních údajů z platformy VEROX.
          </p>

          <section className="space-y-2">
            <h2 className="vx-kicker text-verox-orangeDeep">Jak požádat o smazání účtu</h2>
            <p>Pokud chcete smazat svůj účet VEROX, napište nám na e-mail:</p>
            <p>
              <a
                href="mailto:lipovska.hana@seznam.cz"
                className="font-semibold text-verox-orangeText underline decoration-verox-orange/40 underline-offset-2 hover:text-verox-orangeDeep"
              >
                lipovska.hana@seznam.cz
              </a>
            </p>
            <p>Do předmětu zprávy uveďte:</p>
            <p className="font-mono text-sm text-verox-orangeText">Žádost o smazání účtu VEROX</p>
            <p>Do zprávy prosím napište:</p>
            <ul className="list-disc space-y-1 pl-6 marker:text-verox-orange">
              <li>e-mailovou adresu, kterou jste použili při přihlášení,</li>
              <li>zda jste se přihlašovali přes Google, Facebook nebo e-mail,</li>
              <li>stručnou žádost o smazání účtu.</li>
            </ul>
            <p>Příklad:</p>
            <div className="rounded-[14px] border border-verox-line bg-white p-4 font-mono text-sm leading-7 text-verox-charcoal shadow-[0_8px_24px_rgba(17,17,17,0.06)]">
              <p>Dobrý den,</p>
              <p>žádám o smazání svého účtu na platformě VEROX.</p>
              <p>K přihlášení jsem používal/a e-mail: [váš e-mail].</p>
              <p>Přihlašoval/a jsem se přes: [Google / Facebook / e-mail].</p>
              <p>Děkuji.</p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="vx-kicker text-verox-orangeDeep">Co se po žádosti stane</h2>
            <p>
              Po ověření žádosti smažeme nebo anonymizujeme osobní údaje spojené s vaším účtem, zejména:
            </p>
            <ul className="list-disc space-y-1 pl-6 marker:text-verox-orange">
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
            <h2 className="vx-kicker text-verox-orangeDeep">Lhůta pro vyřízení</h2>
            <p>Žádost vyřídíme v přiměřené lhůtě v souladu s právními předpisy.</p>
            <p>
              Pokud budeme potřebovat ověřit, že žádost skutečně podává vlastník účtu, můžeme vás požádat o doplnění
              informací. Nebudeme po vás požadovat heslo.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="vx-kicker text-verox-orangeDeep">Přihlášení přes Google nebo Facebook</h2>
            <p>
              Smazání účtu na platformě VEROX neznamená smazání vašeho účtu Google nebo Facebook.
            </p>
            <p>
              Pokud chcete spravovat oprávnění udělená platformě VEROX ve svém Google nebo Facebook účtu, proveďte to přímo
              v nastavení svého účtu u dané služby.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="vx-kicker text-verox-orangeDeep">Kontakt</h2>
            <p>Pro žádosti o smazání účtu nebo dotazy k osobním údajům použijte:</p>
            <p>
              <a
                href="mailto:lipovska.hana@seznam.cz"
                className="font-semibold text-verox-orangeText underline decoration-verox-orange/40 underline-offset-2 hover:text-verox-orangeDeep"
              >
                lipovska.hana@seznam.cz
              </a>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="vx-kicker text-verox-orangeDeep">Datum poslední aktualizace</h2>
            <p className="vx-meta">20. května 2026</p>
          </section>
        </article>
      </div>
    </main>
  );
}
