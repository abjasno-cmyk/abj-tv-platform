"use client";

import { useEffect, useState } from "react";

import { fetchProgram, fetchTomorrow } from "@/lib/api";
import { parseTranscriptState, type TranscriptState } from "@/lib/transcriptTypes";

const REFRESH_MS = 5 * 60 * 1000;

type TranscriptBlock = {
  video_id: string | null;
  transcript_state?: unknown;
};

export function buildTranscriptStateMap(blocks: TranscriptBlock[]): Record<string, TranscriptState> {
  const next: Record<string, TranscriptState> = {};
  for (const block of blocks) {
    const state = parseTranscriptState(block.transcript_state);
    if (block.video_id && state) {
      next[block.video_id] = state;
    }
  }
  return next;
}

export function useTranscriptStatesFetcher(): Record<string, TranscriptState> {
  const [states, setStates] = useState<Record<string, TranscriptState>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [today, tomorrow] = await Promise.all([fetchProgram(), fetchTomorrow()]);
      if (cancelled) return;

      setStates({
        ...buildTranscriptStateMap(tomorrow?.blocks ?? []),
        ...buildTranscriptStateMap(today?.blocks ?? []),
      });
    };

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return states;
}
