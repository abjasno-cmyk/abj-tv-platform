import { HERO } from "../data";
import { KomunitaBlock } from "./KomunitaBlock";
import { HighlightMarker } from "./HighlightMarker";
import { PlayMark, SoundOn, Fullscreen } from "./icons";

// Homepage lead — one full-width broadcast frame with a bottom overlay band
// carrying the community CTA, the headline, the author marker and the live
// countdown, mirroring the zasilka "homepage / hlavní video" composition.
export function BroadcastHero() {
  return (
    <section id="zive" className="vx-shell pt-7 lg:pt-9">
      <div className="relative vx-rise" data-delay="2">
        {/* Broadcast frame */}
        <div className="vx-card vx-frame aspect-video">
          <div className="vx-frame__scan" />

          <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
            <span className="vx-badge">
              <span className="vx-live-dot" style={{ background: "#fff" }} /> Živě
            </span>
            <span className="vx-badge vx-badge--ink">{HERO.show}</span>
          </div>

          <div className="absolute right-4 top-4 z-10 hidden items-center gap-3 text-white/85 sm:flex">
            <SoundOn />
            <Fullscreen />
          </div>

          <button type="button" className="vx-play vx-on-dark" aria-label="Spustit vysílání">
            <PlayMark size={30} />
          </button>
        </div>

        {/* Overlay band: static under the frame on mobile, absolute over it from lg */}
        <div className="vx-hero__band vx-on-dark">
          <div className="grid items-stretch gap-4 p-4 lg:grid-cols-[minmax(220px,256px)_1fr_auto] lg:items-end lg:gap-6 lg:p-6">
            <div className="self-end">
              <div className="shadow-xl">
                <KomunitaBlock variant="compact" />
              </div>
            </div>

            <div className="min-w-0 text-verox-ink lg:pb-1 lg:text-white">
              <h1
                className="vx-display"
                style={{ fontSize: "clamp(1.5rem, 2.7vw, 2.5rem)", lineHeight: 1.02 }}
              >
                {HERO.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-[1.05rem]">
                  <HighlightMarker tone="ink">{HERO.author}</HighlightMarker>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="opacity-80"
                    style={{ fontFamily: "var(--vx-mono)", fontSize: "0.66rem", letterSpacing: "0.14em", textTransform: "uppercase" }}
                  >
                    Do konce zbývá
                  </span>
                  <span className="text-[0.95rem]">
                    <HighlightMarker tone="ink">
                      <span style={{ fontFamily: "var(--vx-mono)", fontWeight: 700 }}>{HERO.remaining}</span>
                    </HighlightMarker>
                  </span>
                </span>
              </div>
            </div>

            <div className="hidden self-end justify-self-end lg:block">
              <div className="vx-live-circle">
                <span>
                  Živě
                  <br />
                  vysílání
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editorial separator + two-line synopsis + primary action */}
      <div className="mt-6">
        <hr className="vx-rule-double" />
        <p className="mt-4 max-w-[70ch] text-[1.05rem] leading-relaxed text-verox-charcoal line-clamp-2">
          {HERO.dek}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <span className="vx-kicker text-verox-orangeText">Dnešní hlavní vysílání</span>
          <span className="vx-meta">{HERO.tag}</span>
          <span className="vx-meta">·</span>
          <span className="vx-meta">{HERO.watching} sleduje</span>
          <button type="button" className="ml-auto vx-btn vx-btn--solid">
            <PlayMark size={16} /> Spustit video
          </button>
        </div>
      </div>
    </section>
  );
}
