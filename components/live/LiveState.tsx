"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { RecommendedVideo } from "@/lib/liveRuntime";

export type LiveSegment = {
  id: string;
  title: string;
  channel: string;
  videoId: string | null;
  start_time: string;
  duration: string;
};

export type TimelineSegment = {
  id: string;
  title: string;
  duration: string;
  start_time: string;
  explanation: string;
  phase: "now" | "next" | "later";
  videoId: string | null;
};

export type LiveState = {
  current_segment: LiveSegment | null;
  next_segment: LiveSegment | null;
  timeline: TimelineSegment[];
  viewers_count: number;
  mode: "live" | "on_demand";
  onDemandVideo: RecommendedVideo | null;
};

type LiveStateContextValue = {
  liveState: LiveState;
  setCurrentSegment: (segment: LiveSegment | null) => void;
  setNextSegment: (segment: LiveSegment | null) => void;
  setTimeline: (segments: TimelineSegment[]) => void;
  setViewersCount: (count: number) => void;
  setMode: (mode: "live" | "on_demand") => void;
  setOnDemandVideo: (video: RecommendedVideo | null) => void;
  setLiveState: React.Dispatch<React.SetStateAction<LiveState>>;
};

const LiveStateContext = createContext<LiveStateContextValue | null>(null);

type LiveStateProviderProps = {
  initialState?: Partial<LiveState>;
  children: ReactNode;
};

const DEFAULT_LIVE_STATE: LiveState = {
  current_segment: null,
  next_segment: null,
  timeline: [],
  viewers_count: 0,
  mode: "live",
  onDemandVideo: null,
};

export function LiveStateProvider({ initialState, children }: LiveStateProviderProps) {
  const [liveState, setLiveState] = useState<LiveState>({
    ...DEFAULT_LIVE_STATE,
    ...initialState,
  });

  const value = useMemo(
    () => ({
      liveState,
      setCurrentSegment: (segment: LiveSegment | null) => {
        setLiveState((prev) => ({ ...prev, current_segment: segment }));
      },
      setNextSegment: (segment: LiveSegment | null) => {
        setLiveState((prev) => ({ ...prev, next_segment: segment }));
      },
      setTimeline: (segments: TimelineSegment[]) => {
        setLiveState((prev) => ({ ...prev, timeline: segments }));
      },
      setViewersCount: (count: number) => {
        setLiveState((prev) => ({ ...prev, viewers_count: Math.max(0, Math.floor(count)) }));
      },
      setMode: (mode: "live" | "on_demand") => {
        setLiveState((prev) => ({ ...prev, mode }));
      },
      setOnDemandVideo: (video: RecommendedVideo | null) => {
        setLiveState((prev) => ({ ...prev, onDemandVideo: video }));
      },
      setLiveState,
    }),
    [liveState]
  );

  return <LiveStateContext.Provider value={value}>{children}</LiveStateContext.Provider>;
}

export function useLiveState() {
  const context = useContext(LiveStateContext);
  if (!context) {
    throw new Error("useLiveState must be used within LiveStateProvider");
  }
  return context;
}
