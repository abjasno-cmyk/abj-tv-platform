"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchFillGap, fetchProgramNow, fetchSafetyBridge } from "@/lib/playout/client";
import {
  mapMediaSourcesToFallbacks,
  type PlayoutBlock,
  type PlayoutFiller,
  type PlayoutSurface,
} from "@/lib/playout/types";

// NONSTOP PLAYOUT smyčka dle klientské specifikace.
//
// ZLATÉ PRAVIDLO: na obrazovce vždy něco běží. Přepínáme podle ČASOVAČE
// (expected_ends_at / ends_at), YouTube ENDED je jen bonusový (dřívější) trigger.
// Reklama, která spolkne ENDED, tím přehrávač nezasekne — časovač pokračuje tak jako tak.

const IDENT_TITLE = "ABJ — pokračujeme";

export interface PlayoutInitialBlock {
  videoId: string;
  title?: string;
  offsetSeconds?: number;
  expectedEndsAt?: string | null;
  endsAt?: string | null;
}

export interface UsePlayoutLoopOptions {
  // Když je false (např. divák kouká na vybrané VOD), smyčka stojí.
  enabled: boolean;
  initialBlock?: PlayoutInitialBlock | null;
}

export type PlayoutPhase = "idle" | "live" | "bridge";

export interface PlayoutLoopState {
  surface: PlayoutSurface | null;
  phase: PlayoutPhase;
  // Stage volá při YouTube ENDED — dřívější (bonusový) konec bloku.
  signalEnded: () => void;
}

interface CancelToken {
  cancelled: boolean;
}

interface PendingWait {
  resolve: () => void;
  timer: ReturnType<typeof setTimeout>;
  allowEarlyEnd: boolean;
}

function parseTimeMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function usePlayoutLoop({ enabled, initialBlock }: UsePlayoutLoopOptions): PlayoutLoopState {
  const [surface, setSurface] = useState<PlayoutSurface | null>(null);
  const [phase, setPhase] = useState<PlayoutPhase>("idle");

  const pendingWaitRef = useRef<PendingWait | null>(null);
  const initialBlockRef = useRef<PlayoutInitialBlock | null | undefined>(initialBlock);
  useEffect(() => {
    initialBlockRef.current = initialBlock;
  }, [initialBlock]);

  // Přerušitelné čekání: rozhodne ho časovač, nebo (volitelně) dřívější ENDED,
  // nebo zrušení smyčky (unmount / přepnutí na VOD).
  const waitInterruptible = useCallback(
    (ms: number, token: CancelToken, allowEarlyEnd: boolean): Promise<void> => {
      return new Promise<void>((resolve) => {
        if (token.cancelled) {
          resolve();
          return;
        }
        const finish = () => {
          if (pendingWaitRef.current?.timer) clearTimeout(pendingWaitRef.current.timer);
          pendingWaitRef.current = null;
          resolve();
        };
        const timer = setTimeout(finish, Math.max(0, ms));
        pendingWaitRef.current = { resolve: finish, timer, allowEarlyEnd };
      });
    },
    [],
  );

  // Stage hlásí YouTube ENDED — pokud zrovna čekáme na video a smí skončit dřív, posuň smyčku.
  const signalEnded = useCallback(() => {
    const pending = pendingWaitRef.current;
    if (pending && pending.allowEarlyEnd) {
      pending.resolve();
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const token: CancelToken = { cancelled: false };
    const seed = initialBlockRef.current;

    const showBridgeNow = () => {
      setPhase("bridge");
      setSurface({ kind: "ident", title: IDENT_TITLE });
    };

    const playFiller = async (filler: PlayoutFiller): Promise<void> => {
      if (token.cancelled) return;
      const durationMs = Math.max(1, Math.floor(filler.duration_sec || 15)) * 1000;
      switch (filler.type) {
        case "short":
          if (filler.video_id) {
            setPhase("live");
            setSurface({ kind: "youtube", videoId: filler.video_id, startSeconds: 0, title: filler.title });
            await waitInterruptible(durationMs, token, true);
            return;
          }
          break;
        case "panorama": {
          const url = filler.extra?.panorama?.embed_url;
          if (url) {
            setPhase("bridge");
            setSurface({ kind: "embed", url, label: filler.extra?.panorama?.city });
            await waitInterruptible(durationMs, token, false);
            return;
          }
          break;
        }
        case "weather":
          setPhase("bridge");
          setSurface({ kind: "weather", data: filler.extra?.weather, label: filler.title });
          await waitInterruptible(durationMs, token, false);
          return;
        case "boundary":
        default:
          break;
      }
      // Neznámý typ / chybějící data → lokální ident (nikdy prázdno).
      setPhase("bridge");
      setSurface({ kind: "ident", title: filler.title || IDENT_TITLE });
      await waitInterruptible(durationMs, token, false);
    };

    const playSafetyBridge = async (): Promise<void> => {
      showBridgeNow();
      const { block } = await fetchSafetyBridge(); // nikdy nevyhazuje
      if (token.cancelled) return;
      await playFiller(block);
    };

    const playBlock = async (block: PlayoutBlock, offsetSec: number): Promise<void> => {
      setPhase("live");
      setSurface({
        kind: "youtube",
        videoId: block.video_id,
        startSeconds: Math.max(0, Math.floor(offsetSec || 0)),
        title: block.type,
        fallbacks: mapMediaSourcesToFallbacks(block.media_sources, block.video_id),
      });
      // ZÁKLAD: časovač podle reálného konce videa; ENDED bereme jako bonus (early end).
      const realEnd = parseTimeMs(block.expected_ends_at) ?? parseTimeMs(block.ends_at);
      const msLeft = realEnd ? Math.max(0, realEnd - Date.now()) : 0;
      // Když neznáme konec (realEnd null), spoléháme primárně na ENDED → dlouhý guard timer.
      const guardMs = realEnd ? msLeft : 6 * 60 * 60 * 1000;
      await waitInterruptible(guardMs, token, true);
    };

    const handleBlockEnd = async (block: PlayoutBlock): Promise<void> => {
      showBridgeNow(); // OKAMŽITĚ, ještě než dorazí API
      const slotEndMs = parseTimeMs(block.ends_at);
      const gapSec = slotEndMs ? Math.max(0, Math.floor((slotEndMs - Date.now()) / 1000)) : 0;
      if (gapSec <= 5) return; // žádná mezera → rovnou další pevný blok (loop tickne)

      const fill = await fetchFillGap({ seconds: gapSec, currentBlockId: block.block_id });
      if (token.cancelled) return;
      if (!fill || !Array.isArray(fill.fillers) || fill.fillers.length === 0) {
        await playSafetyBridge();
        return;
      }
      for (const filler of fill.fillers) {
        if (token.cancelled) return;
        await playFiller(filler);
      }
    };

    const runLoop = async () => {
      // OKAMŽITÉ pixely: seed (SSR now-playing) jen zobrazíme. Časování ale NEbereme
      // ze seedu (nemá expected_ends_at) — hned voláme /program/now, ať máme reálný
      // čas konce a přepínáme podle ČASOVAČE, ne podle YouTube ENDED.
      if (seed?.videoId) {
        setPhase("live");
        setSurface({
          kind: "youtube",
          videoId: seed.videoId,
          startSeconds: Math.max(0, Math.floor(seed.offsetSeconds ?? 0)),
          title: seed.title,
        });
      } else {
        showBridgeNow();
      }

      while (!token.cancelled && enabled) {
        const now = await fetchProgramNow();
        if (token.cancelled) return;
        if (!now || !now.block) {
          await playSafetyBridge(); // API/prázdno → drž obraz živý a zkus znovu
          continue;
        }
        // playBlock přepne na reálný blok (stejné video_id = bez reloadu) a nastaví
        // časovač podle expected_ends_at/ends_at.
        await playBlock(now.block, now.offset_sec);
        if (token.cancelled) return;
        await handleBlockEnd(now.block);
      }
    };

    void runLoop();

    return () => {
      token.cancelled = true;
      const pending = pendingWaitRef.current;
      if (pending) {
        clearTimeout(pending.timer);
        pending.resolve();
        pendingWaitRef.current = null;
      }
    };
  }, [enabled, waitInterruptible]);

  return { surface, phase, signalEnded };
}
