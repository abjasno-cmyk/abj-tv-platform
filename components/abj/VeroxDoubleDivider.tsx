export function VeroxDoubleDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`verox-double-divider ${className}`.trim()} aria-hidden="true">
      <span />
      <span />
    </div>
  );
}
