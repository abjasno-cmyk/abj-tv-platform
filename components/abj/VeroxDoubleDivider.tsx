type VeroxDoubleDividerProps = {
  className?: string;
  /** Šířka do 75 % viewportu (dle návrhu ŽIVĚ). */
  partial?: boolean;
  /** Tloušťka linky 6 px (stroke dle návrhu). */
  thick?: boolean;
};

export function VeroxDoubleDivider({ className = "", partial = false, thick = false }: VeroxDoubleDividerProps) {
  return (
    <div
      className={`verox-double-divider ${thick ? "verox-double-divider--thick" : ""} ${partial ? "verox-double-divider--partial" : ""} ${className}`.trim()}
      aria-hidden="true"
    >
      <span />
      <span />
    </div>
  );
}
