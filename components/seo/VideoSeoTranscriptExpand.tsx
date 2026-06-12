"use client";

import { useState } from "react";

import { fetchVideoTranscript } from "@/lib/transcriptApi";
import { splitTranscriptParagraphs } from "@/lib/seo/escape";

type VideoSeoTranscriptExpandProps = {
  videoId: string;
};

export function VideoSeoTranscriptExpand({ videoId }: VideoSeoTranscriptExpandProps) {
  const [loading, setLoading] = useState(false);
  const [paragraphs, setParagraphs] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFullTranscript = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchVideoTranscript(videoId);
      if (!response?.transcript?.trim()) {
        setError("Celý přepis se nepodařilo načíst.");
        return;
      }
      setParagraphs(splitTranscriptParagraphs(response.transcript));
    } catch {
      setError("Celý přepis se nepodařilo načíst.");
    } finally {
      setLoading(false);
    }
  };

  if (paragraphs) {
    return (
      <div className="seo-transcript-body seo-transcript-body--full">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="seo-transcript-expand">
      <button type="button" className="seo-transcript-more" onClick={() => void loadFullTranscript()} disabled={loading}>
        {loading ? "Načítáme celý přepis…" : "Zobrazit celý přepis"}
      </button>
      {error ? <p className="seo-transcript-error">{error}</p> : null}
    </div>
  );
}
