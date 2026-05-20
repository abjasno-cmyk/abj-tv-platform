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
    <details className="rounded-2xl border border-gray-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-bold uppercase tracking-[0.1em] text-gray-700">
        Jak vznikla tato zpráva
      </summary>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <dt className="text-[11px] uppercase tracking-[0.12em] text-gray-500">Počet zdrojů</dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">{sourceCountLabel(item.source_count ?? 0)}</dd>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <dt className="text-[11px] uppercase tracking-[0.12em] text-gray-500">Fact-check</dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">{item.metadata?.fact_check_status ?? "neuvedeno"}</dd>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <dt className="text-[11px] uppercase tracking-[0.12em] text-gray-500">Důvěra</dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">{confidencePercent(item.confidence_score)}%</dd>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <dt className="text-[11px] uppercase tracking-[0.12em] text-gray-500">Neuro rámec</dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">{neuroFrameLabel(item.metadata?.neuro_frame)}</dd>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <dt className="text-[11px] uppercase tracking-[0.12em] text-gray-500">Počet slov</dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">{item.metadata?.word_count ?? "neuvedeno"}</dd>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <dt className="text-[11px] uppercase tracking-[0.12em] text-gray-500">Style score independent</dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">
            {item.metadata?.style_score_independent ?? "neuvedeno"}
          </dd>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <dt className="text-[11px] uppercase tracking-[0.12em] text-gray-500">Cross-check status</dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">{item.metadata?.cross_check_status ?? "neuvedeno"}</dd>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <dt className="text-[11px] uppercase tracking-[0.12em] text-gray-500">Model / prompt</dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">
            {edition.generation_model ?? "neuvedeno"} • {edition.generation_prompt_version ?? "neuvedeno"}
          </dd>
        </div>
      </dl>
    </details>
  );
}
