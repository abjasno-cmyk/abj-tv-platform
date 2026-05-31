import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Podmínky užívání | VEROX",
  description: "Podmínky užívání platformy VEROX.",
};

export default function TermsPage() {
  return (
    <main className="min-h-[calc(100vh-68px)] bg-[#FBF8F2] px-4 py-10 text-verox-ink md:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-9 border-b border-verox-line pb-6">
          <p className="vx-kicker text-verox-orangeDeep">VEROX · právní a informační servis</p>
          <h1
            className="vx-display mt-3 text-verox-ink"
            style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}
          >
            Podmínky užívání platformy VEROX
          </h1>
          <hr className="vx-rule mt-5 h-[2px] w-full" />
        </header>

        <article className="jz-prose max-w-[70ch] space-y-6 text-[15px] leading-relaxed text-verox-charcoal md:text-base">
          <p>Tyto podmínky upravují používání platformy VEROX. Používáním platformy souhlasíte s těmito pravidly.</p>

          <section className="space-y-2">
            <h2 className="vx-kicker text-verox-orangeDeep">1. Co je VEROX</h2>
            <p>
              VEROX je online platforma pro sledování videoobsahu, pořadů, zpráv a dalších mediálních výstupů. Uživatelé
              mohou sledovat obsah, číst zprávy, komentovat, lajkovat, ukládat si oblíbené pořady a pokračovat ve sledování
              tam, kde skončili.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="vx-kicker text-verox-orangeDeep">2. Bezplatný divácký účet</h2>
            <p>Sledování základního obsahu je dostupné zdarma.</p>
            <p>Některé funkce jsou dostupné pouze přihlášeným uživatelům, zejména:</p>
            <ul className="list-disc space-y-1 pl-6 marker:text-verox-orange">
              <li>komentování,</li>
              <li>lajkování,</li>
              <li>zobrazování a správa vlastních komentářů,</li>
              <li>ukládání oblíbených kanálů a pořadů,</li>
              <li>historie sledování,</li>
              <li>pokračování v rozkoukaných videích,</li>
              <li>personalizované funkce platformy.</li>
            </ul>
            <p>Vytvoření diváckého účtu je zdarma.</p>
          </section>

          <section className="space-y-2">
            <h2 className="vx-kicker text-verox-orangeDeep">3. Přihlášení</h2>
            <p>Na platformě se můžete přihlásit například přes Google, Facebook nebo e-mail.</p>
            <p>
              Při přihlášení jste povinni uvádět pravdivé údaje a nesmíte používat účet způsobem, který porušuje zákon,
              práva jiných osob nebo tato pravidla.
            </p>
            <p>Za bezpečnost svého účtu odpovídáte vy. Pokud zjistíte zneužití účtu, kontaktujte nás.</p>
          </section>

          <section className="space-y-2">
            <h2 className="vx-kicker text-verox-orangeDeep">4. Pravidla komentářů a komunitních funkcí</h2>
            <p>
              Cílem platformy je umožnit svobodnou a věcnou diskusi. Svoboda projevu ale neznamená právo ničit prostor
              ostatním uživatelům.
            </p>
            <p>Při používání komentářů a komunitních funkcí nesmíte:</p>
            <ul className="list-disc space-y-1 pl-6 marker:text-verox-orange">
              <li>vkládat nezákonný obsah,</li>
              <li>vyhrožovat jiným osobám,</li>
              <li>cíleně obtěžovat nebo napadat jiné uživatele,</li>
              <li>zveřejňovat osobní údaje jiných osob bez jejich souhlasu,</li>
              <li>šířit spam,</li>
              <li>vkládat škodlivé odkazy nebo technicky útočit na platformu,</li>
              <li>vydávat se za jinou osobu,</li>
              <li>používat automatizované nástroje k zahlcení diskuse,</li>
              <li>porušovat autorská práva nebo jiná práva třetích osob.</li>
            </ul>
            <p>
              Vyhrazujeme si právo odstranit obsah, který tato pravidla porušuje, omezit komentování, zablokovat účet nebo
              přijmout jiná přiměřená opatření.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="vx-kicker text-verox-orangeDeep">5. Obsah platformy</h2>
            <p>
              Obsah zveřejněný na platformě je chráněn autorským právem nebo právy příslušných autorů a provozovatelů.
            </p>
            <p>
              Nesmíte obsah platformy hromadně stahovat, kopírovat, šířit, upravovat nebo komerčně využívat bez souhlasu
              oprávněné osoby, pokud to neumožňuje zákon.
            </p>
            <p>Sdílení běžných odkazů na obsah platformy je povoleno.</p>
          </section>

          <section className="space-y-2">
            <h2 className="vx-kicker text-verox-orangeDeep">6. Uživatelský obsah</h2>
            <p>
              Pokud na platformu vložíte komentář nebo jiný obsah, odpovídáte za to, že neporušuje zákon ani práva třetích
              osob.
            </p>
            <p>
              Vložením komentáře nám udělujete nevýhradní oprávnění tento komentář zobrazovat na platformě, technicky jej
              zpracovat a uchovávat pro účely provozu služby.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="vx-kicker text-verox-orangeDeep">7. Dostupnost služby</h2>
            <p>
              Snažíme se, aby platforma fungovala stabilně a bezpečně. Nemůžeme ale zaručit nepřetržitou dostupnost služby.
              Platforma může být dočasně nedostupná kvůli údržbě, technickým problémům, výpadkům dodavatelů nebo
              bezpečnostním opatřením.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="vx-kicker text-verox-orangeDeep">8. Změny platformy</h2>
            <p>
              Platformu můžeme průběžně upravovat, rozšiřovat nebo měnit její funkce. Některé funkce mohou být testovací,
              dočasné nebo dostupné pouze části uživatelů.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="vx-kicker text-verox-orangeDeep">9. Zrušení účtu</h2>
            <p>Uživatel může požádat o smazání účtu podle postupu uvedeného na stránce:</p>
            <p className="font-mono text-sm text-verox-orangeText">/data-deletion</p>
            <p>
              Provozovatel může účet omezit nebo zrušit, pokud uživatel opakovaně nebo závažně porušuje tyto podmínky,
              zákon nebo bezpečnost platformy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="vx-kicker text-verox-orangeDeep">10. Ochrana osobních údajů</h2>
            <p>Zpracování osobních údajů se řídí samostatnými zásadami ochrany osobních údajů:</p>
            <p className="font-mono text-sm text-verox-orangeText">/privacy</p>
          </section>

          <section className="space-y-2">
            <h2 className="vx-kicker text-verox-orangeDeep">11. Kontakt</h2>
            <p>V případě dotazů nás kontaktujte na:</p>
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
            <h2 className="vx-kicker text-verox-orangeDeep">12. Změny podmínek</h2>
            <p>Tyto podmínky můžeme aktualizovat. Nová verze bude zveřejněna na této stránce.</p>
            <p className="vx-meta">Datum poslední aktualizace: 20. května 2026</p>
          </section>
        </article>
      </div>
    </main>
  );
}
