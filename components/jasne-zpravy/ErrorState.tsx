type JasneZpravyErrorStateProps = {
  message?: string;
};

export function JasneZpravyErrorState({ message }: JasneZpravyErrorStateProps) {
  return (
    <section className="rounded-2xl border border-[rgba(255,106,0,0.4)] bg-[rgba(255,106,0,0.08)] p-6 text-sm text-abj-text1">
      <p>Jasné zprávy se teď nepodařilo načíst. Zkuste to prosím později.</p>
      {message ? <p className="mt-2 text-xs text-abj-text2">{message}</p> : null}
    </section>
  );
}

