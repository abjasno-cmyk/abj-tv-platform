// VEROX wordmark lockup — heavy display caps + the signature orange dot riding
// the top-right, with the "Mainstreamový detox" tagline locked to its width.

type WordmarkProps = { size?: "sm" | "md" | "lg"; tagline?: boolean; inverted?: boolean };

const SIZES = {
  sm: { mark: "1.5rem", dot: 7, gap: "0.34em" },
  md: { mark: "2.1rem", dot: 9, gap: "0.3em" },
  lg: { mark: "clamp(2.6rem, 4.6vw, 4rem)", dot: 13, gap: "0.26em" },
} as const;

export function Wordmark({ size = "md", tagline = true, inverted = false }: WordmarkProps) {
  const s = SIZES[size];
  const markColor = inverted ? "#fbf8f2" : "var(--vx-ink)";
  const taglineColor = inverted ? "rgba(251,248,242,0.6)" : "var(--vx-gray)";
  return (
    <span className="inline-flex flex-col" aria-label="VEROX — Mainstreamový detox">
      <span className="relative inline-flex items-start">
        <span
          className="vx-display"
          style={{ fontSize: s.mark, letterSpacing: "-0.03em", lineHeight: 0.9, color: markColor }}
        >
          VEROX
        </span>
        <span
          aria-hidden="true"
          className="rounded-full bg-verox-orange"
          style={{ width: s.dot, height: s.dot, marginLeft: 3, marginTop: 2 }}
        />
      </span>
      {tagline ? (
        <span
          style={{
            fontFamily: "var(--vx-mono)",
            fontSize: "0.56rem",
            letterSpacing: "0.34em",
            textTransform: "uppercase",
            marginTop: s.gap,
            color: taglineColor,
          }}
        >
          Mainstreamový&nbsp;detox
        </span>
      ) : null}
    </span>
  );
}
