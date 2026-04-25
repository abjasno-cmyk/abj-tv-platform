"use client";

import Image from "next/image";

type HeroCardProps = {
  title: string;
  channel: string;
  publishedAt: string;
  thumbnail: string;
  insight: string;
  href: string;
};

function formatPublished(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "čas neuveden";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function HeroCard({ title, channel, publishedAt, thumbnail, insight, href }: HeroCardProps) {
  return (
    <a
      href={href}
      className="group relative block overflow-hidden rounded-xl border border-[var(--abj-gold-dim)] bg-[var(--card)]"
    >
      <div className="relative aspect-video w-full">
        <Image
          src={thumbnail}
          alt={title}
          fill
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-cover transition-transform group-hover:scale-[1.03]"
          unoptimized={true}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-abj-text2">{channel}</p>
          <h3 className="mt-1 text-xl font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs text-abj-text2">{formatPublished(publishedAt)}</p>
        </div>
      </div>
      <div className="border-l-4 border-yellow-400 bg-yellow-500/10 p-4">
        <h4 className="text-sm font-semibold text-yellow-200">Co to znamená</h4>
        <p className="mt-1 text-sm text-yellow-100/90">{insight}</p>
      </div>
    </a>
  );
}
