import { SWATCHES, TYPE_SPECIMENS } from "../data";
import { SectionLabel } from "./SectionLabel";
import { HighlightMarker } from "./HighlightMarker";

function ColorCard({ name, hex, rgb, role }: (typeof SWATCHES)[number]) {
  const light = name === "Paper";
  return (
    <div className="vx-card overflow-hidden">
      <div className="flex h-24 items-end p-3" style={{ background: hex, color: light ? "#171411" : "#fff" }}>
        <span style={{ fontFamily: "var(--vx-mono)", fontSize: "0.8rem", letterSpacing: "0.04em" }}>{hex}</span>
      </div>
      <div className="p-3">
        <span className="block font-semibold text-verox-ink" style={{ fontFamily: "var(--vx-sans)" }}>
          {name}
        </span>
        <span className="block vx-meta">RGB {rgb}</span>
        <span className="mt-1 block text-[0.78rem] text-verox-gray">{role}</span>
      </div>
    </div>
  );
}

export function TokenSpecimen() {
  return (
    <section id="muj-verox" className="vx-shell mt-20">
      <SectionLabel index="(04)" title="Vzorník" kicker="Design system" />

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        {/* Colour */}
        <div>
          <h3 className="vx-kicker">Barvy</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SWATCHES.map((s) => (
              <ColorCard key={s.hex} {...s} />
            ))}
          </div>
        </div>

        {/* Type */}
        <div>
          <h3 className="vx-kicker">Písmo</h3>
          <div className="mt-3 space-y-4">
            {TYPE_SPECIMENS.map((t) => (
              <div key={t.face} className="vx-card p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-verox-ink" style={{ fontFamily: "var(--vx-sans)" }}>
                    {t.face}
                  </span>
                  <span className="vx-meta">{t.role}</span>
                </div>
                <p className={`mt-3 text-verox-ink ${t.className}`} style={t.style}>
                  {t.sample}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Components */}
      <div className="mt-10">
        <h3 className="vx-kicker">Komponenty</h3>
        <div className="mt-3 vx-card flex flex-wrap items-center gap-4 p-6">
          <button type="button" className="vx-btn vx-btn--solid">Spustit video</button>
          <button type="button" className="vx-btn">Přidat do Můj Verox</button>
          <button type="button" className="vx-btn vx-btn--ghost-ink vx-btn--sm">Komentář</button>
          <span className="text-[1.1rem]">
            <HighlightMarker tone="ink">V kostce</HighlightMarker>
          </span>
          <span className="text-[1.1rem]">
            <HighlightMarker tone="orange">Živě</HighlightMarker>
          </span>
          <span className="vx-badge">
            <span className="vx-live-dot" style={{ background: "#fff" }} /> Živě
          </span>
          <span className="vx-badge vx-badge--ink">Premiéra</span>
        </div>
      </div>
    </section>
  );
}
