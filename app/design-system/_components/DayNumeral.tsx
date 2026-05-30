import { HighlightMarker } from "./HighlightMarker";

type DayNumeralProps = { day: string; month: string; ghost?: boolean; size?: "sm" | "lg" };

// The oversized editorial date marker: a marker-highlighted month label sitting
// on top of a big numeral — the rhythmic anchor of the feed and video grid.
export function DayNumeral({ day, month, ghost, size = "lg" }: DayNumeralProps) {
  const numeralSize = size === "lg" ? "clamp(3.4rem, 7vw, 5.4rem)" : "2.4rem";
  const monthSize = size === "lg" ? "0.62rem" : "0.5rem";
  return (
    <div className="flex flex-col items-start leading-none">
      <span className="mb-1.5 inline-block" style={{ fontSize: monthSize }}>
        <HighlightMarker tone="ink">
          <span style={{ fontFamily: "var(--vx-mono)", letterSpacing: "0.16em", textTransform: "uppercase" }}>
            {month}
          </span>
        </HighlightMarker>
      </span>
      <span className={`vx-numeral ${ghost ? "vx-numeral--ghost" : ""}`} style={{ fontSize: numeralSize }}>
        {day}
      </span>
    </div>
  );
}
