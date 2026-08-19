import type { Metadata } from "next";
import Link from "next/link";

import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { ProudXAboutPage } from "@/components/legal/proudx/ProudXLegalPages";
import { TENANT } from "@/lib/tenant";

// Cíl „Application home page" pro Google OAuth brand verifikaci: statická
// server-rendered stránka s 200 (žádný redirect — checker redirecty nesnáší),
// která popisuje účel aplikace a důvod přihlášení přes Google.
const VEROX_METADATA: Metadata = {
  title: "O platformě VEROX | VEROX",
  description:
    "VEROX je nezávislá internetová televize — nonstop živý program a videa z desítek nezávislých českých a slovenských kanálů.",
};

const PROUDX_METADATA: Metadata = {
  title: "O platformě ProudX | ProudX",
  description: "ProudX — bezplatná internetová televize: nepřetržitý proud a katalog videí. Provozuje POLYCONSULT, spol. s r.o.",
};

export const metadata: Metadata = TENANT.id === "proudx" ? PROUDX_METADATA : VEROX_METADATA;

export default function AboutPage() {
  if (TENANT.id === "proudx") {
    return <ProudXAboutPage />;
  }
  return (
    <LegalPageLayout title="VEROX — nezávislá internetová televize" subtitle="Mainstreamový detox">
      <p>
        VEROX je nezávislá internetová televize. Nabízí nonstop živý program a videa z desítek
        nezávislých českých a slovenských kanálů — zpravodajství, publicistiku, rozhovory a
        podcasty na jednom místě. Sledování je zdarma a bez registrace na{" "}
        <Link href="/live" className="text-[#FFB782] hover:text-[#FFD8BC]">
          www.verox.cz/live
        </Link>
        .
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">K čemu slouží přihlášení</h2>
        <p>
          S bezplatným diváckým účtem můžete komentovat, ukládat si oblíbené pořady a pokračovat ve
          sledování tam, kde jste přestali. Přihlásit se lze e-mailem nebo účtem Google.
        </p>
        <p>
          Při přihlášení přes Google žádáme pouze o základní profil (jméno a e-mailovou adresu) —
          slouží výhradně k vytvoření a správě vašeho diváckého účtu. Žádná další data z vašeho
          Google účtu nečteme ani neukládáme.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">Dokumenty</h2>
        <p>
          <Link href="/privacy" className="text-[#FFB782] hover:text-[#FFD8BC]">
            Zásady ochrany osobních údajů
          </Link>
          {" · "}
          <Link href="/terms" className="text-[#FFB782] hover:text-[#FFD8BC]">
            Podmínky užívání
          </Link>
          {" · "}
          <Link href="/data-deletion" className="text-[#FFB782] hover:text-[#FFD8BC]">
            Smazání účtu
          </Link>
        </p>
      </section>
    </LegalPageLayout>
  );
}
