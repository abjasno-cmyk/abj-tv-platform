"use client";

import { useEffect, useRef, useState } from "react";

import { fetchProgram, type ProgramResponse } from "@/lib/api";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useProgram(date?: string) {
  const [program, setProgram] = useState<ProgramResponse | null>(null);
  const [loading, setLoading] = useState(() => true);
  const [stale, setStale] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const revisionRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const data = await fetchProgram(date);
      if (!mounted || !data) {
        if (mounted) setLoading(false);
        return;
      }

      const revision = typeof data.revision_id === "string" ? data.revision_id : null;
      if (revision && revision !== revisionRef.current) {
        revisionRef.current = revision;
      }
      setProgram(data);

      const staleAfter = Date.parse(data.stale_after);
      if (Number.isFinite(staleAfter)) {
        setStale(staleAfter < Date.now());
      } else {
        setStale(false);
      }

      setLoading(false);
    };

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [date, reloadTick]);

  const reload = () => {
    setLoading(true);
    setReloadTick((prev) => prev + 1);
  };

  return { program, loading, stale, reload };
}
