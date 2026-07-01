"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/components/auth/AuthProvider";

// Sdílený stav uložených článků Novin pro celou stránku.
//
// Bez tohohle providera fetchovalo KAŽDÉ tlačítko `SaveNovinyArticleButton` celý
// seznam `/api/viewer/saved-noviny` na svém mountu (cache: no-store) → jedno
// zobrazení feedu = N stejných GETů + N DB spojení. Provider načte množinu JEDNOU
// a tlačítka z ní jen čtou. Toggle se promítne lokálně (žádný refetch).

type SavedNovinyContextValue = {
  isSaved: (articleId: string) => boolean;
  setSaved: (articleId: string, saved: boolean) => void;
};

const SavedNovinyContext = createContext<SavedNovinyContextValue | null>(null);

// Vrací null, když není provider v stromu — volající pak použije vlastní fallback.
export function useSavedNoviny(): SavedNovinyContextValue | null {
  return useContext(SavedNovinyContext);
}

export function SavedNovinyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    // Anonymní divák nic uloženého nemá — stav gateuje `isAuthenticated` níž,
    // takže tu není potřeba (a nesmí být) synchronní setState.
    if (!isAuthenticated) return;
    let cancelled = false;
    void fetch("/api/viewer/saved-noviny", { cache: "no-store", credentials: "include" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          articles?: Array<{ articleId: string }>;
        };
        if (!cancelled && response.ok) {
          setSavedIds(new Set((payload.articles ?? []).map((article) => article.articleId)));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const value = useMemo<SavedNovinyContextValue>(
    () => ({
      isSaved: (articleId) => isAuthenticated && savedIds.has(articleId),
      setSaved: (articleId, saved) =>
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (saved) next.add(articleId);
          else next.delete(articleId);
          return next;
        }),
    }),
    [isAuthenticated, savedIds],
  );

  return <SavedNovinyContext.Provider value={value}>{children}</SavedNovinyContext.Provider>;
}
