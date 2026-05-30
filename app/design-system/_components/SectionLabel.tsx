type SectionLabelProps = {
  index: string;
  title: string;
  kicker?: string;
  right?: React.ReactNode;
  id?: string;
};

// Editorial section header: numbered index, display title and a thin orange
// rule that bleeds to the column edge — the connective tissue of the layout.
export function SectionLabel({ index, title, kicker, right, id }: SectionLabelProps) {
  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-2" id={id}>
      <span className="vx-kicker pb-2">{index}</span>
      <h2
        className="vx-display text-verox-ink"
        style={{ fontSize: "clamp(1.5rem, 3vw, 2.3rem)", lineHeight: 1 }}
      >
        {title}
      </h2>
      {kicker ? <span className="vx-kicker pb-2 text-verox-orangeDeep">{kicker}</span> : null}
      <hr className="vx-rule mb-2 h-[2px] min-w-[40px] flex-1" />
      {right ? <div className="pb-1">{right}</div> : null}
    </div>
  );
}
