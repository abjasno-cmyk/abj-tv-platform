"use client";

import { useEffect, useMemo, useRef } from "react";
import YouTube, { type YouTubeProps } from "react-youtube";

import type { GapFillItem } from "@/lib/underrunProtection";

type UnderrunOverlayPlayerProps = {
  filler: GapFillItem | null;
  onFinished: () => void;
  onError: (error?: unknown) => void;
};

function normalizeDurationMs(seconds: number | undefined): number {
  const value = Number.isFinite(seconds) ? Number(seconds) : 0;
  return Math.max(0, Math.floor(value * 1000));
}

function PanoramaFiller({ filler }: { filler: GapFillItem }) {
  const embedUrl = filler.extra?.panorama?.embed_url ?? "";
  const city = filler.extra?.panorama?.city ?? "Panorama";

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-black">
      {embedUrl ? (
        <iframe
          title={`Panorama ${city}`}
          src={embedUrl}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-abj-text2">Panorama není dostupné</div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/50 px-3 py-2 text-xs text-abj-text1">
        Panorama • {city}
      </div>
    </div>
  );
}

function WeatherFiller({ filler }: { filler: GapFillItem }) {
  const weather = filler.extra?.weather;
  const wind = weather?.wind_kmh ?? weather?.wind_kph;
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl border border-sky-400/30 bg-sky-950/40 p-6">
      <div className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.1em] text-sky-200">Počasí</p>
        <h3 className="text-2xl font-semibold text-white">{weather?.city ?? "Neznámé město"}</h3>
        <p className="text-4xl font-bold text-sky-100">
          {typeof weather?.temp_c === "number" ? `${Math.round(weather.temp_c)} °C` : "-- °C"}
        </p>
        <p className="text-sm text-sky-200">Vítr: {typeof wind === "number" ? `${Math.round(wind)} km/h` : "neuvedeno"}</p>
      </div>
    </div>
  );
}

function ShortFiller({ filler }: { filler: GapFillItem }) {
  const videoId = filler.video_id ?? null;
  const opts = useMemo<YouTubeProps["opts"]>(
    () => ({
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        rel: 0,
        modestbranding: 1,
      },
    }),
    []
  );
  return (
    <div className="h-full w-full overflow-hidden rounded-xl border border-white/10 bg-black">
      {videoId ? (
        <YouTube videoId={videoId} opts={opts} iframeClassName="h-full w-full" />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-abj-text2">Short filler bez video_id</div>
      )}
    </div>
  );
}

function BoundaryFiller({ filler }: { filler: GapFillItem }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl border border-yellow-400/30 bg-[#0b1324]">
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-40"
        src="/nekonecna_smycka.mp4"
        autoPlay
        muted
        loop
        playsInline
        onError={() => undefined}
      />
      <div className="relative text-center">
        <p className="text-xs uppercase tracking-[0.15em] text-yellow-200">ABJ ident</p>
        <p className="mt-2 text-4xl font-bold text-yellow-300">{filler.title ?? "ABJ"}</p>
      </div>
    </div>
  );
}

export function UnderrunOverlayPlayer({ filler, onFinished, onError }: UnderrunOverlayPlayerProps) {
  const fillerSignature = filler ? `${filler.type}-${filler.duration_sec}-${filler.video_id ?? ""}-${filler.title ?? ""}` : null;
  const activeSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!filler || !fillerSignature) {
      activeSignatureRef.current = null;
      return;
    }
    if (activeSignatureRef.current === fillerSignature) {
      return;
    }
    activeSignatureRef.current = fillerSignature;
    const durationMs = normalizeDurationMs(filler.duration_sec);
    if (!durationMs) {
      activeSignatureRef.current = null;
      onFinished();
      return;
    }
    const timer = window.setTimeout(() => {
      activeSignatureRef.current = null;
      onFinished();
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [filler, fillerSignature, onFinished]);

  if (!filler) return null;

  return (
    <div className="absolute inset-0 z-30 bg-black/80 p-2">
      {filler.type === "panorama" ? (
        <PanoramaFiller filler={filler} />
      ) : filler.type === "weather" ? (
        <WeatherFiller filler={filler} />
      ) : filler.type === "short" ? (
        <ShortFiller filler={filler} />
      ) : (
        <BoundaryFiller filler={filler} />
      )}
      <button
        type="button"
        onClick={() => onError(new Error("manual-fallback"))}
        className="absolute bottom-4 right-4 rounded border border-white/20 bg-black/50 px-3 py-1 text-xs text-white"
      >
        Nouzový fallback
      </button>
    </div>
  );
}
