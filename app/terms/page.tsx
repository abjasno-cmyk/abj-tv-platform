import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Podmínky užívání | VEROX",
  description: "Podmínky užívání platformy VEROX.",
};

export default function TermsPage() {
  return (
    <LegalPageLayout title="Podmínky užívání platformy VEROX">
      <p>Tyto podmínky upravují používání platformy VEROX. Používáním platformy souhlasíte s těmito pravidly.</p>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">1. Co je VEROX</h2>
        <p>
          VEROX je online platforma pro sledování videoobsahu, pořadů, zpráv a dalších mediálních výstupů. Uživatelé
          mohou sledovat obsah, číst zprávy, komentovat, lajkovat, ukládat si oblíbené pořady a pokračovat ve sledování
          tam, kde skončili.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">2. Bezplatný divácký účet</h2>
        <p>Sledování základního obsahu je dostupné zdarma.</p>
        <p>Některé funkce jsou dostupné pouze přihlášeným uživatelům, zejména:</p>
        <ul className="list-disc space-y-1 pl-6">
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
        <h2 className="text-lg font-bold text-white">3. Přihlášení</h2>
        <p>Na platformě se můžete přihlásit například přes Google, Facebook nebo e-mail.</p>
        <p>
          Při přihlášení jste povinni uvádět pravdivé údaje a nesmíte používat účet způsobem, který porušuje zákon,
          práva jiných osob nebo tato pravidla.
        </p>
        <p>Za bezpečnost svého účtu odpovídáte vy. Pokud zjistíte zneužití účtu, kontaktujte nás.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">4. Pravidla komentářů a komunitních funkcí</h2>
        <p>
          Cílem platformy je umožnit svobodnou a věcnou diskusi. Svoboda projevu ale neznamená právo ničit prostor
          ostatním uživatelům.
        </p>
        <p>Při používání komentářů a komunitních funkcí nesmíte:</p>
        <ul className="list-disc space-y-1 pl-6">
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
        <h2 className="text-lg font-bold text-white">5. Obsah platformy</h2>
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
        <h2 className="text-lg font-bold text-white">6. Uživatelský obsah</h2>
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
        <h2 className="text-lg font-bold text-white">7. Dostupnost služby</h2>
        <p>
          Snažíme se, aby platforma fungovala stabilně a bezpečně. Nemůžeme ale zaručit nepřetržitou dostupnost služby.
          Platforma může být dočasně nedostupná kvůli údržbě, technickým problémům, výpadkům dodavatelů nebo
          bezpečnostním opatřením.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">8. Změny platformy</h2>
        <p>
          Platformu můžeme průběžně upravovat, rozšiřovat nebo měnit její funkce. Některé funkce mohou být testovací,
          dočasné nebo dostupné pouze části uživatelů.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">9. Zrušení účtu</h2>
        <p>Uživatel může požádat o smazání účtu podle postupu uvedeného na stránce:</p>
        <p>/data-deletion</p>
        <p>
          Provozovatel může účet omezit nebo zrušit, pokud uživatel opakovaně nebo závažně porušuje tyto podmínky,
          zákon nebo bezpečnost platformy.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">10. Ochrana osobních údajů</h2>
        <p>Zpracování osobních údajů se řídí samostatnými zásadami ochrany osobních údajů:</p>
        <p>/privacy</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">11. Kontakt</h2>
        <p>V případě dotazů nás kontaktujte na:</p>
        <p>
          <a href="mailto:lipovska.hana@seznam.cz" className="text-[#FFB782] hover:text-[#FFD8BC]">
            lipovska.hana@seznam.cz
          </a>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">12. Změny podmínek</h2>
        <p>Tyto podmínky můžeme aktualizovat. Nová verze bude zveřejněna na této stránce.</p>
        <p>Datum poslední aktualizace:</p>
        <p>20. května 2026</p>
      </section>
    </LegalPageLayout>
  );
}
