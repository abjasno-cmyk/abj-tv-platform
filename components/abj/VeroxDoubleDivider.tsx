type VeroxDoubleDividerProps = {
  className?: string;
  /** Šířka do 75 % viewportu (dle návrhu ŽIVĚ). */
  partial?: boolean;
  /** Tloušťka linky 6 px (stroke dle starší šablony). */
  thick?: boolean;
  /** Tenké vlasové linky dle wireframe v2 (homepage). */
  hairline?: boolean;
};

export function VeroxDoubleDivider({
  className = "",
  partial = false,
  thick = false,
  hairline = false,
}: VeroxDoubleDividerProps) {
  return (
    <div
      className={`verox-double-divider ${thick ? "verox-double-divider--thick" : ""} ${hairline ? "verox-double-divider--hairline" : ""} ${partial ? "verox-double-divider--partial" : ""} ${className}`.trim()}
      aria-hidden="true"
    >
      <span />
      <span />
    </div>
  );
}
