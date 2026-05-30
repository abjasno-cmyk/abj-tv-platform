// Hand-drawn highlighter swash used behind active nav items, month labels and
// section markers — straight from the VEROX reference layouts.

type HighlightMarkerProps = {
  children: React.ReactNode;
  tone?: "ink" | "orange";
  className?: string;
};

export function HighlightMarker({ children, tone = "ink", className }: HighlightMarkerProps) {
  return (
    <span className={`vx-mark ${className ?? ""}`} data-tone={tone}>
      <span>{children}</span>
    </span>
  );
}
