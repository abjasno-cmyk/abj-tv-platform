"use client";

import { useEffect, useRef, useState } from "react";

import type {
  VideoTranscriptErrorPayload,
  VideoTranscriptPayload,
  VideoTranscriptSegment,
} from "@/lib/videoTranscriptTypes";

type TranscriptPanelProps = {
  videoId: string | null;
  className?: string;
};

function errorMessageFor(errorCode: VideoTranscriptErrorPayload["errorCode"] | null): string {
  if (errorCode === "video_unavailable") return "Video není na YouTube dostupné.";
  if (errorCode === "transcript_disabled") return "Toto video nemá zveřejněný přepis.";
  if (errorCode === "transcript_not_available") return "Přepis pro toto video není dostupný.";
  if (errorCode === "too_many_requests") return "YouTube dočasně omezuje načítání přepisů. Zkuste to znovu.";
  if (errorCode === "invalid_video_id") return "Neplatné video ID.";
  return "Přepis se nepodařilo načíst.";
}

function TranscriptRows({ segments }: { segments: VideoTranscriptSegment[] }) {
  return (
    <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-3">
      {segments.map((segment, idx) => (
        <p key={`${segment.offsetSeconds}-${idx}`} className="text-sm leading-relaxed text-[var(--abj-text1)]">
          <span className="mr-2 inline-block rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--abj-text2)]">
            {segment.offsetLabel}
          </span>
          {segment.text}
        </p>
      ))}
    </div>
  );
}

export function TranscriptPanel({ videoId, className }: TranscriptPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<VideoTranscriptErrorPayload["errorCode"] | null>(null);
  const [transcript, setTranscript] = useState<VideoTranscriptPayload | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    setIsOpen(false);
    setLoading(false);
    setErrorCode(null);
    setTranscript(null);
    requestRef.current += 1;
  }, [videoId]);

  const canLoad = Boolean(videoId);

  const loadTranscript = async (force = false) => {
    if (!videoId) return;
    if (loading) return;
    if (transcript && !force) return;

    setLoading(true);
    setErrorCode(null);
    const requestId = ++requestRef.current;

    try {
      const response = await fetch(`/api/youtube/transcript?videoId=${encodeURIComponent(videoId)}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as VideoTranscriptPayload | VideoTranscriptErrorPayload;
      if (requestId !== requestRef.current) return;

      if (!response.ok || !("segments" in payload)) {
        setTranscript(null);
        setErrorCode("errorCode" in payload ? payload.errorCode : "upstream_error");
        return;
      }

      setTranscript(payload);
      setErrorCode(null);
    } catch {
      if (requestId !== requestRef.current) return;
      setTranscript(null);
      setErrorCode("upstream_error");
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  };

  if (!canLoad) return null;

  return (
    <section className={className}>
      <button
        type="button"
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--abj-gold-dim)] bg-[rgba(255,255,255,0.08)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--abj-text1)] hover:bg-[rgba(255,255,255,0.14)]"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) {
            void loadTranscript();
          }
        }}
      >
        {isOpen ? "Skrýt přepis" : "Zobrazit přepis"}
      </button>

      {isOpen ? (
        <div className="mt-2 rounded-xl border border-[var(--abj-gold-dim)] bg-[rgba(5,9,15,0.75)] p-3">
          {loading ? <p className="text-sm text-[var(--abj-text2)]">Načítám kompletní přepis…</p> : null}

          {!loading && errorCode ? (
            <div className="space-y-2">
              <p className="text-sm text-[var(--abj-text2)]">{errorMessageFor(errorCode)}</p>
              <button
                type="button"
                className="rounded-md border border-white/20 px-2 py-1 text-xs text-[var(--abj-text1)] hover:bg-white/10"
                onClick={() => {
                  void loadTranscript(true);
                }}
              >
                Zkusit znovu
              </button>
            </div>
          ) : null}

          {!loading && !errorCode && transcript ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--abj-text2)]">
                Kompletní přepis {transcript.language ? `(${transcript.language})` : ""}
              </p>
              <TranscriptRows segments={transcript.segments} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
