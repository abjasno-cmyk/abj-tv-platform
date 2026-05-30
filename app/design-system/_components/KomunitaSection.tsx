import { SectionLabel } from "./SectionLabel";
import { KomunitaBlock } from "./KomunitaBlock";

const STATS = [
  { value: "412", label: "online teď" },
  { value: "18k", label: "členů komunity" },
  { value: "24/7", label: "živý chat" },
];

// Dedicated Komunita section — surfaces the full live chat board and gives the
// #komunita nav anchor a real destination.
export function KomunitaSection() {
  return (
    <section id="komunita" className="vx-shell mt-20">
      <SectionLabel index="(03)" title="Komunita" kicker="Živě v chatu" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(320px,380px)]">
        <div className="flex flex-col justify-between gap-8">
          <p className="max-w-[46ch] text-[1.05rem] leading-relaxed text-verox-charcoal">
            Sledujte vysílání společně. Pište do živého chatu, reagujte na hosty a ptejte se
            přímo do studia — vaše zprávy běží přes obraz v reálném čase.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="vx-card p-4">
                <div className="vx-numeral" style={{ fontSize: "2rem" }}>
                  {s.value}
                </div>
                <div className="vx-meta mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="vx-btn vx-btn--solid">Připojit se zdarma</button>
            <button type="button" className="vx-btn">Pravidla komunity</button>
          </div>
        </div>
        <div className="vx-card overflow-hidden">
          <KomunitaBlock />
        </div>
      </div>
    </section>
  );
}
