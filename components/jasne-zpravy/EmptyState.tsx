type JasneZpravyEmptyStateProps = {
  noPublished?: boolean;
};

export function JasneZpravyEmptyState({ noPublished = false }: JasneZpravyEmptyStateProps) {
  return (
    <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-6 text-sm text-abj-text2">
      {noPublished
        ? "Zatím není publikované žádné vydání Jasných zpráv."
        : "Aktuální vydání zatím není k dispozici."}
    </section>
  );
}

