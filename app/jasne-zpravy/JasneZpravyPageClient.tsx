"use client";

import { useEffect, useMemo, useState } from "react";

import { EditionMeta } from "@/components/jasne-zpravy/EditionMeta";
import { JasneZpravyEmptyState } from "@/components/jasne-zpravy/EmptyState";
import { JasneZpravyErrorState } from "@/components/jasne-zpravy/ErrorState";
import { JasneZpravyHeader } from "@/components/jasne-zpravy/JasneZpravyHeader";
import { JasneZpravyLoadingState } from "@/components/jasne-zpravy/LoadingState";
import { NewsSection } from "@/components/jasne-zpravy/NewsSection";
import { JASNE_ZPRAVY_CATEGORY_ORDER, fetchLatestPublishedJasneZpravyBundle } from "@/lib/jasneZpravyData";
import { createMockJasneZpravyBundle } from "@/lib/jasneZpravyMock";
import type { JasneZpravyBundle, JasneZpravyCategory } from "@/lib/jasneZpravyTypes";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message?: string }
  | { kind: "no-published" }
  | { kind: "empty" }
  | { kind: "ready"; bundle: JasneZpravyBundle; source: "supabase" | "mock" | "cache" };

const MOCK_ENV_KEY = "NEXT_PUBLIC_USE_JASNE_ZPRAVY_MOCK";
const CACHE_KEY = "abj.jasne-zpravy.latest-success";

function shouldUseMockData(): boolean {
  const raw = process.env[MOCK_ENV_KEY];
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function groupByCategory(bundle: JasneZpravyBundle): Record<JasneZpravyCategory, typeof bundle.items> {
  return {
    domestic: bundle.items.filter((item) => item.category === "domestic"),
    foreign: bundle.items.filter((item) => item.category === "foreign"),
    curiosity: bundle.items.filter((item) => item.category === "curiosity"),
  };
}

function loadCachedBundle(): JasneZpravyBundle | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as JasneZpravyBundle;
  } catch {
    return null;
  }
}

function saveCachedBundle(bundle: JasneZpravyBundle) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(bundle));
  } catch {
    // Ignore storage write failures.
  }
}

export function JasneZpravyPageClient() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState({ kind: "loading" });
      const useMock = shouldUseMockData();
      if (useMock) {
        const mock = createMockJasneZpravyBundle();
        if (!cancelled) setState({ kind: "ready", bundle: mock, source: "mock" });
        return;
      }

      try {
        const supabase = createSupabaseBrowserClient();
        const bundle = await fetchLatestPublishedJasneZpravyBundle(supabase);
        if (cancelled) return;
        if (!bundle.edition) {
          setState({ kind: "no-published" });
          return;
        }
        if (bundle.items.length === 0) {
          setState({ kind: "empty" });
          return;
        }
        saveCachedBundle(bundle);
        setState({ kind: "ready", bundle, source: "supabase" });
      } catch (error) {
        if (cancelled) return;
        const cached = loadCachedBundle();
        if (cached?.edition && cached.items.length > 0) {
          setState({ kind: "ready", bundle: cached, source: "cache" });
          return;
        }
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : undefined,
        });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    if (state.kind !== "ready") {
      return {
        domestic: [],
        foreign: [],
        curiosity: [],
      };
    }
    return groupByCategory(state.bundle);
  }, [state]);

  const renderBody = () => {
    if (state.kind === "loading") return <JasneZpravyLoadingState />;
    if (state.kind === "error") return <JasneZpravyErrorState message={state.message} />;
    if (state.kind === "no-published") return <JasneZpravyEmptyState noPublished={true} />;
    if (state.kind === "empty") return <JasneZpravyEmptyState noPublished={false} />;
    return (
      <>
        <EditionMeta edition={state.bundle.edition!} itemCount={state.bundle.items.length} />
        {state.source === "cache" ? (
          <p className="rounded-lg border border-[var(--abj-gold-dim)] bg-[rgba(255,255,255,0.8)] px-3 py-2 text-xs text-abj-text2">
            Zobrazuje se poslední dostupné vydání uložené v zařízení.
          </p>
        ) : null}
        {state.source === "mock" ? (
          <p className="rounded-lg border border-[rgba(255,106,0,0.3)] bg-[rgba(255,106,0,0.08)] px-3 py-2 text-xs text-abj-text2">
            Zobrazená data jsou mock data pro testování UI.
          </p>
        ) : null}
        <div className="space-y-8">
          {JASNE_ZPRAVY_CATEGORY_ORDER.map((category) => (
            <NewsSection
              key={category}
              category={category}
              items={grouped[category]}
              expandedItemId={expandedItemId}
              onToggleItem={(itemId) => setExpandedItemId((prev) => (prev === itemId ? null : itemId))}
            />
          ))}
        </div>
      </>
    );
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <JasneZpravyHeader />
      {renderBody()}
    </section>
  );
}

