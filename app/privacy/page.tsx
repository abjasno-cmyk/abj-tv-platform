import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Zásady ochrany osobních údajů | VEROX",
  description: "Zásady ochrany osobních údajů platformy VEROX.",
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Zásady ochrany osobních údajů"
      subtitle="Platné pro platformu VEROX"
    >
      <p>
        Platforma VEROX umožňuje sledování videoobsahu, čtení zpráv, komentování, lajkování, ukládání oblíbených
        pořadů a pokračování ve sledování rozkoukaných videí. Některé funkce jsou dostupné pouze přihlášeným
        uživatelům.
      </p>
      <p>
        Tyto zásady vysvětlují, jaké osobní údaje zpracováváme, proč je zpracováváme a jaká máte práva.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">1. Kdo je správcem údajů</h2>
        <p>Správcem osobních údajů je provozovatel platformy VEROX.</p>
        <p>Kontaktní e-mail pro otázky týkající se ochrany osobních údajů:</p>
        <p>
          <a href="mailto:lipovska.hana@seznam.cz" className="text-[#FFB782] hover:text-[#FFD8BC]">
            lipovska.hana@seznam.cz
          </a>
        </p>
        <p>
          Tento kontakt můžete použít také pro žádosti o přístup k údajům, opravu údajů nebo smazání účtu.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">2. Jaké údaje zpracováváme</h2>
        <p>
          Pokud platformu pouze navštěvujete bez přihlášení, můžeme zpracovávat základní technické údaje potřebné pro
          provoz webu, bezpečnost a měření návštěvnosti.
        </p>
        <p>
          Pokud si vytvoříte bezplatný divácký účet nebo se přihlásíte přes Google, Facebook nebo e-mail, můžeme
          zpracovávat zejména:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>e-mailovou adresu,</li>
          <li>zobrazované jméno,</li>
          <li>profilovou fotografii, pokud ji poskytne přihlašovací služba,</li>
          <li>informaci o způsobu přihlášení,</li>
          <li>datum vytvoření účtu,</li>
          <li>datum posledního přihlášení,</li>
          <li>vaše komentáře,</li>
          <li>vaše lajky,</li>
          <li>oblíbené kanály a pořady,</li>
          <li>informace o zhlédnutých a rozkoukaných videích,</li>
          <li>pozici, kde jste přestali video sledovat,</li>
          <li>základní údaje o aktivitě na platformě,</li>
          <li>technické údaje potřebné pro bezpečnost a fungování služby.</li>
        </ul>
        <p>
          Nežádáme přístup k vašemu Gmailu, Facebook zprávám, kontaktům, souborům, kalendáři ani jiným soukromým datům
          mimo základní údaje potřebné k přihlášení.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">3. Proč údaje zpracováváme</h2>
        <p>Údaje zpracováváme zejména proto, abychom mohli:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>vytvořit a spravovat váš bezplatný divácký účet,</li>
          <li>umožnit přihlášení přes Google, Facebook nebo e-mail,</li>
          <li>umožnit komentování a lajkování,</li>
          <li>zobrazovat vaše oblíbené kanály a pořady,</li>
          <li>pamatovat si, co jste už viděli a kde jste ve sledování skončili,</li>
          <li>chránit platformu před spamem, zneužitím a technickými útoky,</li>
          <li>zlepšovat obsah, uživatelské prostředí a stabilitu služby,</li>
          <li>plnit právní povinnosti.</li>
        </ul>
        <p>Newsletter nebo marketingové e-maily vám budeme posílat pouze tehdy, pokud s tím samostatně souhlasíte.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">4. Právní základ zpracování</h2>
        <p>Osobní údaje zpracováváme na základě těchto právních důvodů:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>plnění smlouvy nebo poskytování služby, pokud používáte divácký účet,</li>
          <li>oprávněný zájem na bezpečném a funkčním provozu platformy,</li>
          <li>souhlas, pokud se přihlásíte k newsletteru nebo jinému dobrovolnému odběru,</li>
          <li>splnění právních povinností, pokud nám je ukládá zákon.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">5. Přihlášení přes Google a Facebook</h2>
        <p>
          Pokud se přihlásíte přes Google nebo Facebook, příslušná služba nám předá základní údaje potřebné k
          vytvoření účtu, zejména e-mail, jméno a případně profilovou fotografii.
        </p>
        <p>
          Tyto údaje používáme pouze pro provoz vašeho účtu na platformě VEROX. Nezískáváme přístup k vašim soukromým
          zprávám, kontaktům, souborům ani jiným službám.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">6. Komentáře a veřejná aktivita</h2>
        <p>
          Pokud napíšete komentář, může být viditelný ostatním uživatelům platformy. U komentáře se může zobrazit vaše
          zvolené jméno nebo uživatelský profil.
        </p>
        <p>
          Vyhrazujeme si právo odstranit komentáře, které porušují zákon, pravidla platformy, obsahují spam, výhrůžky,
          osobní útoky, nezákonný obsah nebo technické zneužití služby.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">7. Komu údaje předáváme</h2>
        <p>Osobní údaje neprodáváme.</p>
        <p>
          Pro provoz platformy můžeme využívat důvěryhodné technické služby, například poskytovatele hostingu,
          databáze, autentizace, analytiky nebo e-mailové rozesílky. Tito poskytovatelé zpracovávají údaje pouze v
          rozsahu potřebném pro fungování služby.
        </p>
        <p>Při přihlášení přes Google nebo Facebook se zároveň řídíte pravidly těchto služeb.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">8. Jak dlouho údaje uchováváme</h2>
        <p>Údaje uchováváme po dobu existence vašeho účtu nebo po dobu nezbytnou pro účely, pro které byly získány.</p>
        <p>
          Pokud požádáte o smazání účtu, smažeme nebo anonymizujeme osobní údaje související s účtem, pokud nám jejich
          další uchování neukládá zákon nebo není nezbytné pro ochranu právních nároků, bezpečnost platformy či svobodu
          projevu. GDPR obecně dává jednotlivcům právo požádat o výmaz osobních údajů, ale zároveň připouští výjimky,
          například pokud jsou údaje potřebné pro výkon svobody projevu nebo splnění právní povinnosti.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">9. Vaše práva</h2>
        <p>Podle pravidel ochrany osobních údajů máte zejména právo:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>požádat o informaci, jaké údaje o vás zpracováváme,</li>
          <li>požádat o opravu nepřesných údajů,</li>
          <li>požádat o smazání údajů,</li>
          <li>požádat o omezení zpracování,</li>
          <li>vznést námitku proti některému zpracování,</li>
          <li>odvolat souhlas, pokud je zpracování založeno na souhlasu,</li>
          <li>požádat o přenositelnost údajů,</li>
          <li>podat stížnost u dozorového úřadu.</li>
        </ul>
        <p>
          Evropská komise tato práva shrnuje jako právo být informován, právo na přístup, opravu, výmaz, omezení
          zpracování, přenositelnost a námitku.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">10. Smazání účtu</h2>
        <p>Pokud chcete smazat svůj účet a související údaje, postup najdete na stránce:</p>
        <p>/data-deletion</p>
        <p>nebo nám napište na kontaktní e-mail uvedený výše.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">11. Změny těchto zásad</h2>
        <p>
          Tyto zásady můžeme aktualizovat, zejména pokud se změní funkce platformy, právní požadavky nebo používané
          technické služby.
        </p>
        <p>Datum poslední aktualizace:</p>
        <p>20. května 2026</p>
      </section>
    </LegalPageLayout>
  );
}
