import { Wordmark } from "./Wordmark";
import { NAV_ITEMS } from "../data";

export function VeroxFooter() {
  return (
    <footer className="vx-on-dark mt-24 border-t-2 border-verox-ink bg-verox-ink text-verox-paper">
      <div className="vx-shell grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark size="md" inverted />
          <p className="mt-5 max-w-[34ch] text-sm leading-relaxed text-verox-paper/70">
            Nezávislá živá televize. Vysíláme bez příkras, čteme mezi řádky a necháváme prostor vám.
          </p>
        </div>

        <div>
          <span className="vx-kicker text-verox-paper/50">Vysílání</span>
          <ul className="mt-4 space-y-2">
            {NAV_ITEMS.map((item) => (
              <li key={`f-${item.href}`}>
                <a href={item.href} className="text-sm text-verox-paper/80 transition-colors hover:text-verox-orange">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <span className="vx-kicker text-verox-paper/50">Naladit</span>
          <p className="mt-4 text-sm text-verox-paper/70">Každý všední den živě od 7:00.</p>
          <a href="#top" className="vx-btn vx-btn--solid mt-4 uppercase tracking-[0.08em]">
            Přihlásit zdarma
          </a>
        </div>
      </div>
      <div className="border-t border-verox-paper/15">
        <div className="vx-shell flex flex-wrap items-center justify-between gap-3 py-4">
          <span className="vx-meta text-verox-paper/50">© 2026 VEROX · Mainstreamový detox</span>
          <span className="vx-meta text-verox-paper/50">Design system · MageXo</span>
        </div>
      </div>
    </footer>
  );
}
