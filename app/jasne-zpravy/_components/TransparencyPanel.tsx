import {
  confidencePercent,
  neuroFrameLabel,
  sourceCountLabel,
  type NewsEdition,
  type NewsItem,
} from "@/lib/jasne-zpravy";

type TransparencyPanelProps = {
  item: NewsItem;
  edition: NewsEdition;
};

export function TransparencyPanel({ item, edition }: TransparencyPanelProps) {
  return (
    <details className="border-2 border-verox-line bg-verox-card p-4">
      <summary className="cursor-pointer text-sm font-bold uppercase tracking-[0.1em] text-verox-ink">
        Jak vznikla tato zpráva
      </summary>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="border-2 border-verox-line bg-verox-paper p-3">
          <dt className="vx-meta">Počet zdrojů</dt>
          <dd className="mt-1 text-sm font-semibold text-verox-ink">{sourceCountLabel(item.source_count ?? 0)}</dd>
        </div>
        <div className="border-2 border-verox-line bg-verox-paper p-3">
          <dt className="vx-meta">Fact-check</dt>
          <dd className="mt-1 text-sm font-semibold text-verox-ink">{item.metadata?.fact_check_status ?? "neuvedeno"}</dd>
        </div>
        <div className="border-2 border-verox-line bg-verox-paper p-3">
          <dt className="vx-meta">Důvěra</dt>
          <dd className="mt-1 text-sm font-semibold text-verox-ink">{confidencePercent(item.confidence_score)}%</dd>
        </div>
        <div className="border-2 border-verox-line bg-verox-paper p-3">
          <dt className="vx-meta">Neuro rámec</dt>
          <dd className="mt-1 text-sm font-semibold text-verox-ink">{neuroFrameLabel(item.metadata?.neuro_frame)}</dd>
        </div>
        <div className="border-2 border-verox-line bg-verox-paper p-3">
          <dt className="vx-meta">Počet slov</dt>
          <dd className="mt-1 text-sm font-semibold text-verox-ink">{item.metadata?.word_count ?? "neuvedeno"}</dd>
        </div>
        <div className="border-2 border-verox-line bg-verox-paper p-3">
          <dt className="vx-meta">Style score independent</dt>
          <dd className="mt-1 text-sm font-semibold text-verox-ink">
            {item.metadata?.style_score_independent ?? "neuvedeno"}
          </dd>
        </div>
        <div className="border-2 border-verox-line bg-verox-paper p-3">
          <dt className="vx-meta">Cross-check status</dt>
          <dd className="mt-1 text-sm font-semibold text-verox-ink">{item.metadata?.cross_check_status ?? "neuvedeno"}</dd>
        </div>
        <div className="border-2 border-verox-line bg-verox-paper p-3">
          <dt className="vx-meta">Model / prompt</dt>
          <dd className="mt-1 text-sm font-semibold text-verox-ink">
            {edition.generation_model ?? "neuvedeno"} • {edition.generation_prompt_version ?? "neuvedeno"}
          </dd>
        </div>
      </dl>
    </details>
  );
}
