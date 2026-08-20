import Link from "next/link";

import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

// Právní stránky ProudX — provozovatel POLYCONSULT, spol. s r.o.
// ProudX nevede divácké účty (auth modul vypnutý) — texty jsou proto výrazně
// jednodušší než VEROX: web jen streamuje veřejný obsah a měří anonymní
// návštěvnost. Při zapnutí auth modulu bude potřeba rozšířit.

const OPERATOR = (
  <>
    <p>
      Provozovatelem platformy ProudX je <strong>POLYCONSULT, spol. s r.o.</strong>, IČO 61457990,
      se sídlem Za zahradami 391/9, Dolní Měcholupy, 111 01 Praha 10 (dále „provozovatel").
    </p>
  </>
);

const CONTACT = (
  <p>
    Žádosti a dotazy přijímáme písemně na adrese sídla provozovatele: POLYCONSULT, spol. s r.o.,
    Za zahradami 391/9, Dolní Měcholupy, 111 01 Praha 10.
  </p>
);

export function ProudXPrivacyPage() {
  return (
    <LegalPageLayout title="Zásady ochrany osobních údajů" subtitle="Platné pro platformu ProudX">
      {OPERATOR}
      <p>
        Platforma ProudX umožňuje sledování živého vysílání a videí. Nevede uživatelské účty,
        nevyžaduje registraci ani přihlášení a neukládá žádné údaje, kterými byste se nám
        identifikovali.
      </p>
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">1. Jaké údaje zpracováváme</h2>
        <p>
          <strong>Anonymní statistiky návštěvnosti</strong> — měříme přes Vercel Web Analytics,
          nástroj bez souborů cookie a bez sledování napříč weby; data jsou agregovaná a nelze z
          nich určit konkrétního návštěvníka.
        </p>
        <p>
          <strong>Technické záznamy serveru</strong> — IP adresa a údaje o požadavku se krátkodobě
          zpracovávají v provozních záznamech infrastruktury (Vercel) pro zajištění bezpečnosti a
          stability služby.
        </p>
        <p>
          <strong>Nastavení přehrávače</strong> (např. hlasitost) se ukládá pouze ve vašem
          prohlížeči (localStorage) a nikam se neodesílá.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">2. Obsah třetích stran</h2>
        <p>
          Videa se přehrávají prostřednictvím vloženého přehrávače YouTube. Při přehrávání se
          uplatní podmínky a zásady společnosti Google (YouTube). Doporučujeme se s nimi seznámit
          na stránkách poskytovatele.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">3. Vaše práva</h2>
        <p>
          Máte práva podle nařízení GDPR — zejména právo na informace, přístup, opravu a výmaz.
          Vzhledem k tomu, že nevedeme účty ani identifikované údaje, je rozsah zpracování
          minimální.
        </p>
        {CONTACT}
      </section>
    </LegalPageLayout>
  );
}

export function ProudXTermsPage() {
  return (
    <LegalPageLayout title="Podmínky užívání" subtitle="Platné pro platformu ProudX">
      {OPERATOR}
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">1. Služba</h2>
        <p>
          ProudX je bezplatná internetová televize — nepřetržitý videoproud a katalog videí z
          veřejně dostupných zdrojů. Sledování nevyžaduje registraci.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">2. Obsah</h2>
        <p>
          Přehrávaná videa pocházejí od jejich autorů a vydavatelů a jsou přehrávána vloženým
          přehrávačem YouTube v souladu s jeho podmínkami. Práva k obsahu náleží jednotlivým
          autorům; ProudX obsah nevytváří ani neupravuje a názory v něm vyjádřené nevyjadřují
          postoje provozovatele.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">3. Odpovědnost</h2>
        <p>
          Služba je poskytována „tak, jak je". Provozovatel neodpovídá za dostupnost obsahu
          třetích stran ani za přerušení provozu; vyvíjí však přiměřené úsilí o stabilní chod
          platformy.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">4. Kontakt</h2>
        {CONTACT}
      </section>
    </LegalPageLayout>
  );
}

export function ProudXDataDeletionPage() {
  return (
    <LegalPageLayout title="Smazání údajů" subtitle="Platné pro platformu ProudX">
      {OPERATOR}
      <p>
        ProudX nevede uživatelské účty a neukládá identifikované osobní údaje — není proto co
        mazat na úrovni účtu. Nastavení přehrávače uložené ve vašem prohlížeči odstraníte
        vymazáním dat webu v nastavení prohlížeče.
      </p>
      <p>
        Pokud se přesto domníváte, že o vás zpracováváme osobní údaje, a přejete si jejich výmaz,
        kontaktujte nás:
      </p>
      {CONTACT}
    </LegalPageLayout>
  );
}

export function ProudXAboutPage() {
  return (
    <LegalPageLayout title="ProudX — nepřetržitý proud videí" subtitle="Zůstaňte v proudu">
      <p>
        ProudX je bezplatná internetová televize: nepřetržitý živý proud a
        katalog videí z desítek českých a slovenských kanálů — zpravodajství, rozhovory, komentáře
        a podcasty na jednom místě, bez registrace, na{" "}
        <Link href="/live" className="text-[#6a8cff] hover:text-[#9ab2ff]">
          proudx.cz/live
        </Link>
        .
      </p>
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">Provozovatel</h2>
        <p>
          POLYCONSULT, spol. s r.o.
          <br />
          IČO 61457990
          <br />
          Za zahradami 391/9, Dolní Měcholupy, 111 01 Praha 10
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">Dokumenty</h2>
        <p>
          <Link href="/privacy" className="text-[#6a8cff] hover:text-[#9ab2ff]">
            Zásady ochrany osobních údajů
          </Link>
          {" · "}
          <Link href="/terms" className="text-[#6a8cff] hover:text-[#9ab2ff]">
            Podmínky užívání
          </Link>
          {" · "}
          <Link href="/data-deletion" className="text-[#6a8cff] hover:text-[#9ab2ff]">
            Smazání údajů
          </Link>
        </p>
      </section>
    </LegalPageLayout>
  );
}
