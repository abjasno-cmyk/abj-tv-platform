"use client";

import { useEffect, useRef, useState } from "react";

import { fetchProgram, type ProgramResponse } from "@/lib/api";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useProgram(date?: string) {
  const [program, setProgram] = useState<ProgramResponse | null>(null);
  const [loading, setLoading] = useState(() => true);
  const [stale, setStale] = useState(false);
  const revisionRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const data = await fetchProgram(date);
      if (!mounted || !data) {
        if (mounted) setLoading(false);
        return;
      }

      if (data.revision_id !== revisionRef.current) {
        revisionRef.current = data.revision_id;
        setProgram(data);
        setStale(false);
      }

      if (new Date(data.stale_after) < new Date()) {
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
  }, [date]);

  return { program, loading, stale };
}
