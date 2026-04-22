"use client";

import { useEffect, useState } from "react";

import { fetchHealth, type HealthResponse } from "@/lib/api";

const HEALTH_POLL_INTERVAL_MS = 2 * 60 * 1000;

export function useHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const data = await fetchHealth();
      if (!mounted) return;
      setHealth(data);
      setLoading(false);
    };

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, HEALTH_POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return { health, loading };
}
