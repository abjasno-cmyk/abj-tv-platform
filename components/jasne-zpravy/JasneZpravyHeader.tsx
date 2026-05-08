type JasneZpravyHeaderProps = {
  title?: string;
  subtitle?: string;
};

export function JasneZpravyHeader({
  title = "Jasné zprávy",
  subtitle = "Dnešní přehled bez zbytečné mlhy.",
}: JasneZpravyHeaderProps) {
  return (
    <header className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-5 shadow-[0_10px_24px_rgba(17,17,17,0.08)]">
      <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">ABJ newsroom</p>
      <h1 className="mt-2 font-[var(--font-serif)] text-3xl font-semibold text-abj-text1 sm:text-4xl">{title}</h1>
      <p className="mt-2 text-base leading-relaxed text-abj-text2">{subtitle}</p>
    </header>
  );
}

