"use client";

type NewsTileTag = "BREAKING" | "DNES" | "TÝDEN" | "STÁLÉ";

const tagStyles: Record<NewsTileTag, string> = {
  BREAKING: "bg-red-500 text-white",
  DNES: "bg-yellow-500 text-black",
  TÝDEN: "bg-blue-500 text-white",
  STÁLÉ: "bg-gray-600 text-white",
};

type NewsTileProps = {
  title: string;
  summary: string;
  source: string;
  time: string;
  tag: NewsTileTag;
  aiInsight: string;
  liked: boolean;
  saved: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onShowMore: () => void;
};

export function NewsTile({
  title,
  summary,
  source,
  time,
  tag,
  aiInsight,
  liked,
  saved,
  onToggleLike,
  onToggleSave,
  onShowMore,
}: NewsTileProps) {
  const isBreaking = tag === "BREAKING";

  return (
    <article
      className={`abj-tv-card rounded-xl border border-gray-800 bg-[#111827] p-5 transition-all hover:scale-[1.02] hover:border-yellow-500 hover:shadow-xl ${
        isBreaking ? "ring-1 ring-red-500 shadow-lg [animation:pulseSoft_1.4s_ease-in-out_infinite_alternate]" : ""
      }`}
      style={{ contentVisibility: "auto", containIntrinsicSize: "420px" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${tagStyles[tag]}`}>
          {tag}
        </span>
        <span className="text-xs text-gray-400">{time}</span>
      </div>

      <h3 className="mb-2 text-[20px] font-semibold leading-[1.3] text-white">{title}</h3>

      <p className="mb-4 text-[15px] leading-[1.6] text-gray-300">{summary}</p>

      <div className="mt-3 border-l-2 border-yellow-400 bg-yellow-500/10 px-3 py-2">
        <p className="text-sm text-yellow-200">{aiInsight}</p>
      </div>

      <button type="button" className="mt-3 text-sm text-yellow-400 hover:text-yellow-300" onClick={onShowMore}>
        Více k tématu →
      </button>

      <div className="mt-4 flex items-center justify-between">
        <span className="truncate pr-3 text-xs text-gray-500">{source}</span>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggleLike}
            className={`rounded-md border px-2.5 py-1 text-sm transition ${
              liked ? "border-rose-400 bg-rose-500/20 text-rose-100" : "border-white/15 text-gray-300 hover:text-white"
            }`}
          >
            👍
          </button>
          <button
            type="button"
            onClick={onToggleSave}
            className={`rounded-md border px-2.5 py-1 text-sm transition ${
              saved ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-white/15 text-gray-300 hover:text-white"
            }`}
          >
            💾
          </button>
        </div>
      </div>
    </article>
  );
}
