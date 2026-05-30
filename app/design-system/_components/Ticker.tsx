import { TICKER_ITEMS } from "../data";

// Broadcast headline ticker. Two identical sibling tracks each translate a full
// -100% (see verox-ds.css), so as one exits left its twin fills behind it — a
// seamless loop. The second run is aria-hidden so the strip announces once.
export function Ticker() {
  const run = (id: "a" | "b") => (
    <span className="vx-ticker__track" key={id} aria-hidden={id === "b"}>
      {TICKER_ITEMS.map((item, i) => (
        <span className="vx-ticker__item" key={`${id}-${i}`}>
          <span className="vx-ticker__star" aria-hidden="true">✦</span>
          {item}
        </span>
      ))}
    </span>
  );

  return (
    <div className="vx-ticker vx-rise" data-delay="2" role="region" aria-label="Aktuálně ve vysílání">
      <div className="flex">
        {run("a")}
        {run("b")}
      </div>
    </div>
  );
}
