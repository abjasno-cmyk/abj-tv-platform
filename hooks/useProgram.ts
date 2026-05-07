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

      const revisionId = typeof data.revision_id === "string" ? data.revision_id : null;
      if (revisionId === null || revisionId !== revisionRef.current) {
        revisionRef.current = revisionId;
        setProgram(data);
        setStale(false);
      }

      const staleAfterTs =
        typeof data.stale_after === "string" ? Date.parse(data.stale_after) : NaN;
      if (Number.isFinite(staleAfterTs) && staleAfterTs < Date.now()) {
        setStale(true);
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
