"use client";

import { useEffect, useRef, useState } from "react";

import {
  fetchVideoTranscript,
  TRANSCRIPT_POLL_HARD_TIMEOUT_MS,
  TRANSCRIPT_POLL_INTERVAL_MS,
  TRANSCRIPT_POLL_SOFT_TIMEOUT_MS,
} from "@/lib/transcriptApi";
import { isTranscriptPending, type TranscriptResponse } from "@/lib/transcriptTypes";

type PollPhase = "idle" | "loading" | "polling" | "done";

export type VideoTranscriptPollState = {
  response: TranscriptResponse | null;
  phase: PollPhase;
  softTimedOut: boolean;
  hardTimedOut: boolean;
  retry: () => void;
};

export function useVideoTranscriptPoll(videoId: string | null, enabled: boolean): VideoTranscriptPollState {
  const [response, setResponse] = useState<TranscriptResponse | null>(null);
  const [phase, setPhase] = useState<PollPhase>("idle");
  const [softTimedOut, setSoftTimedOut] = useState(false);
  const [hardTimedOut, setHardTimedOut] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  const retry = () => {
    setRetryTick((value) => value + 1);
  };

  useEffect(() => {
    if (!enabled || !videoId) {
      setResponse(null);
      setPhase("idle");
      setSoftTimedOut(false);
      setHardTimedOut(false);
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();
    const wasPendingRef = { current: false };

    setResponse(null);
    setPhase("loading");
    setSoftTimedOut(false);
    setHardTimedOut(false);

    const updateTimeouts = () => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= TRANSCRIPT_POLL_SOFT_TIMEOUT_MS) {
        setSoftTimedOut(true);
      }
      return elapsed;
    };

    const load = async (): Promise<boolean> => {
      if (cancelled) return false;

      const elapsed = updateTimeouts();
      if (elapsed >= TRANSCRIPT_POLL_HARD_TIMEOUT_MS) {
        setHardTimedOut(true);
        setPhase("done");
        return false;
      }

      const data = await fetchVideoTranscript(videoId);
      if (cancelled) return false;

      updateTimeouts();

      if (data) {
        setResponse(data);
        if (isTranscriptPending(data.status)) {
          wasPendingRef.current = true;
          setPhase("polling");
          return true;
        }
        wasPendingRef.current = false;
        setPhase("done");
        return false;
      }

      if (wasPendingRef.current) {
        setPhase("polling");
        return true;
      }

      setPhase("done");
      return false;
    };

    const intervalId = setInterval(() => {
      void load().then((shouldContinue) => {
        if (!shouldContinue && !cancelled) {
          clearInterval(intervalId);
        }
      });
    }, TRANSCRIPT_POLL_INTERVAL_MS);

    void load().then((shouldContinue) => {
      if (!shouldContinue && !cancelled) {
        clearInterval(intervalId);
      }
    });

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [enabled, retryTick, videoId]);

  return { response, phase, softTimedOut, hardTimedOut, retry };
}
