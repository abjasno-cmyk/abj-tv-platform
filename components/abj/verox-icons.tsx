// Inline VEROX icons shared by the live homepage editorial sections.
// Mirrors app/design-system/_components/icons.tsx so the live app and the
// showcase stay visually identical without cross-importing showcase internals.

type IconProps = { className?: string; size?: number };

export function PlayMark({ className, size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 001.52.85l10-6.5a1 1 0 000-1.7l-10-6.5A1 1 0 008 5.5z" />
    </svg>
  );
}

export function ArrowRight({ className, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HeartMark({ className, size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 20s-7-4.35-9.5-8.5C.9 8.7 2.2 5.5 5.3 5.5c1.9 0 3.1 1.1 3.7 2 .6-.9 1.8-2 3.7-2 3.1 0 4.4 3.2 2.8 6-2.5 4.15-9.5 8.5-9.5 8.5z" />
    </svg>
  );
}
