"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { useTranscriptStatesFetcher } from "@/hooks/useTranscriptStates";
import { type TranscriptState } from "@/lib/transcriptTypes";

type TranscriptStatesContextValue = {
  getState: (videoId: string | null | undefined) => TranscriptState | undefined;
  registerStates: (states: Record<string, TranscriptState>) => void;
};

const TranscriptStatesContext = createContext<TranscriptStatesContextValue | null>(null);

export function TranscriptStatesProvider({ children }: { children: ReactNode }) {
  const fetchedStates = useTranscriptStatesFetcher();
  const [seedStates, setSeedStates] = useState<Record<string, TranscriptState>>({});

  const registerStates = useCallback((states: Record<string, TranscriptState>) => {
    setSeedStates((prev) => ({ ...prev, ...states }));
  }, []);

  const value = useMemo<TranscriptStatesContextValue>(() => {
    const merged = { ...seedStates, ...fetchedStates };
    return {
      registerStates,
      getState: (videoId) => {
        if (!videoId) return undefined;
        return merged[videoId];
      },
    };
  }, [fetchedStates, registerStates, seedStates]);

  return <TranscriptStatesContext.Provider value={value}>{children}</TranscriptStatesContext.Provider>;
}

export function useTranscriptState(videoId: string | null | undefined): TranscriptState | undefined {
  const context = useContext(TranscriptStatesContext);
  if (!context || !videoId) return undefined;
  return context.getState(videoId);
}

export function useRegisterTranscriptStates(): TranscriptStatesContextValue["registerStates"] {
  const context = useContext(TranscriptStatesContext);
  return useMemo(
    () => context?.registerStates ?? (() => undefined),
    [context],
  );
}
