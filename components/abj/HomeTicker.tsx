type HomeTickerProps = { items: string[] };

// Broadcast headline ticker. Two identical sibling tracks each translate a full
// -100% (see globals.css .vx-ticker), so as one exits left its twin fills behind
// it — a seamless loop. The second run is aria-hidden so the strip announces once.
export function HomeTicker({ items }: HomeTickerProps) {
  if (items.length === 0) return null;

  const run = (id: "a" | "b") => (
    <span className="vx-ticker__track" key={id} aria-hidden={id === "b"}>
      {items.map((item, i) => (
        <span className="vx-ticker__item" key={`${id}-${i}`}>
          <span className="vx-ticker__star" aria-hidden="true">
            ✦
          </span>
          {item}
        </span>
      ))}
    </span>
  );

  return (
    <div className="vx-ticker" role="region" aria-label="Aktuálně ve vysílání">
      <div className="flex">
        {run("a")}
        {run("b")}
      </div>
    </div>
  );
}
