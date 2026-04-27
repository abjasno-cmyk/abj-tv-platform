"use client";

type WhatItMeansCardProps = {
  headline: string;
  summary: string;
  whyItMatters: string;
  impact: string;
};

export function WhatItMeansCard({ headline, summary, whyItMatters, impact }: WhatItMeansCardProps) {
  return (
    <section className="rounded-xl border border-[#1F3856] bg-[#0A1422] p-4 text-white shadow-[0_12px_30px_rgba(0,0,0,0.38)]">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#7AA8D9]">Interpretace</p>
      <h3 className="mt-1 text-base font-semibold text-[#E8F2FF]">{headline}</h3>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#CAD8E8]">
        <p>{summary}</p>
        <p>{whyItMatters}</p>
        <p className="font-medium text-[#E5EEF9]">{impact}</p>
      </div>
    </section>
  );
}
