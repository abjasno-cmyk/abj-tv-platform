"use client";

type WhatItMeansCardProps = {
  headline: string;
  summary: string;
  whyItMatters: string;
  impact: string;
};

export function WhatItMeansCard({ headline, summary, whyItMatters, impact }: WhatItMeansCardProps) {
  return (
    <section className="rounded-2xl border border-sky-500/35 bg-[linear-gradient(170deg,#071020,#0B1F38_52%,#0A1528)] p-4 text-white shadow-[0_16px_42px_rgba(0,0,0,0.5)]">
      <p className="text-[10px] uppercase tracking-[0.18em] text-sky-200">What it means</p>
      <h3 className="mt-2 text-lg font-semibold text-white sm:text-xl">{headline}</h3>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-200 sm:text-base">
        <p>{summary}</p>
        <p>{whyItMatters}</p>
        <p className="font-semibold text-sky-100">{impact}</p>
      </div>
    </section>
  );
}
