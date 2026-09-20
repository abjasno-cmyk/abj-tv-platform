"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchFillGap, fetchProgramNow, fetchSafetyBridge } from "@/lib/playout/client";
import {
  isPlayablePlayoutBlock,
  isValidYouTubeVideoId,
  mapMediaSourcesToFallbacks,
  readPlayoutVideoId,
  type PlayoutBlock,
  type PlayoutFiller,
  type PlayoutSurface,
} from "@/lib/playout/types";
import { useAds } from "@/components/ads/AdsProvider";
import { bumpSessionShown, isAdPreview, pickVideoAd } from "@/lib/ads/types";

// NONSTOP PLAYOUT smyčka dle klientské specifikace.
//
// ZLATÉ PRAVIDLO: na obrazovce vždy něco běží. Přepínáme podle ČASOVAČE
// (expected_ends_at / ends_at), YouTube ENDED je jen bonusový (dřívější) trigger.
// Reklama, která spolkne ENDED, tím přehrávač nezasekne — časovač pokračuje tak jako tak.

const IDENT_TITLE = "ABJ — pokračujeme";
// Hybrid: krátká VEROX znělka (lokální ident) na začátku každé mezery, pak panorama.
const VEROX_IDENT_SEC = 4;
// Minimální délka jedné iterace smyčky — back-pressure proti rychlému spinu na
// hranici bloku, když engine ještě nepřepnul stav (expirovaný blok → msLeft=0).
const MIN_ITERATION_MS = 1500;

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
  const adUnits = useAds();
  const adUnitsRef = useRef(adUnits);
  adUnitsRef.current = adUnits;
  const adTickRef = useRef(0);

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
          if (isValidYouTubeVideoId(filler.video_id)) {
            setPhase("live");
            setSurface({
              kind: "youtube",
              videoId: filler.video_id!.trim(),
              startSeconds: 0,
              title: filler.title,
            });
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

    const waitForVideoAds = async (): Promise<void> => {
      const deadline = Date.now() + 2500;
      while (!token.cancelled && Date.now() < deadline) {
        if (adUnitsRef.current.some((unit) => unit.placement === "between_videos")) return;
        await new Promise((resolve) => window.setTimeout(resolve, 80));
      }
    };

    const playScheduledAd = async (moment: "before" | "between", title?: string | null): Promise<void> => {
      if (token.cancelled) return;
      if (moment === "between") adTickRef.current += 1;
      const unit = pickVideoAd(adUnitsRef.current, moment, title, adTickRef.current);
      if (!unit) return;
      const durationMs = Math.max(5, unit.duration_sec) * 1000;
      const label = unit.advertiser ? `Reklama · ${unit.advertiser}` : "Reklama";
      if (unit.video_id && isValidYouTubeVideoId(unit.video_id)) {
        setPhase("live");
        setSurface({
          kind: "youtube",
          videoId: unit.video_id.trim(),
          startSeconds: 0,
          title: label,
          channel: "Reklama",
        });
        await waitInterruptible(durationMs, token, true);
        if (!token.cancelled) bumpSessionShown(unit.id);
        return;
      }
      const image = unit.image_desktop || unit.image_tablet || unit.image_mobile;
      if (!image) return;
      setPhase("bridge");
      setSurface({ kind: "ad", image, title: label, clickUrl: unit.click_url });
      await waitInterruptible(durationMs, token, false);
      if (!token.cancelled) bumpSessionShown(unit.id);
    };

    const playBlock = async (block: PlayoutBlock, offsetSec: number): Promise<void> => {
      const videoId = readPlayoutVideoId(block);
      if (!videoId) {
        await playSafetyBridge();
        return;
      }

      // Reklama „před pořadem“ jen na začátku bloku, ne když divák skočí doprostřed.
      // ?reklama=1 pustí zkoušku hned, i když pořad už běží. Počkáme, až se inventář načte.
      if (isAdPreview()) await waitForVideoAds();
      if (offsetSec < 20 || isAdPreview()) {
        await playScheduledAd("before", block.title);
        if (token.cancelled) return;
      }

      setPhase("live");
      setSurface({
        kind: "youtube",
        videoId,
        startSeconds: Math.max(0, Math.floor(offsetSec || 0)),
        title: block.title,
        channel: block.channel,
        fallbacks: mapMediaSourcesToFallbacks(block.media_sources, videoId),
      });
      // ZÁKLAD: časovač podle reálného konce videa; ENDED bereme jako bonus (early end).
      const realEnd = parseTimeMs(block.expected_ends_at) ?? parseTimeMs(block.ends_at);
      const msLeft = realEnd ? Math.max(0, realEnd - Date.now()) : 0;
      // Když neznáme konec (realEnd null), spoléháme primárně na ENDED → dlouhý guard timer.
      const guardMs = realEnd ? msLeft : 6 * 60 * 60 * 1000;
      await waitInterruptible(guardMs, token, true);
    };

    const handleBlockEnd = async (block: PlayoutBlock, nextBlockId?: string | null): Promise<void> => {
      await playScheduledAd("between", block.title);
      if (token.cancelled) return;
      showBridgeNow(); // OKAMŽITĚ, ještě než dorazí API
      const slotEndMs = parseTimeMs(block.ends_at);
      const gapSec = slotEndMs ? Math.max(0, Math.floor((slotEndMs - Date.now()) / 1000)) : 0;
      if (gapSec <= 5) return; // žádná mezera → rovnou další pevný blok (loop tickne)

      // HYBRID: nejdřív krátká VEROX znělka (lokální ident), souběžně doptáme fill-gap.
      const fillPromise = fetchFillGap({
        seconds: Math.max(0, gapSec - VEROX_IDENT_SEC),
        currentBlockId: block.block_id,
        nextBlockId,
      });
      await playFiller({ type: "boundary", duration_sec: VEROX_IDENT_SEC, title: IDENT_TITLE });
      if (token.cancelled) return;

      const fill = await fillPromise;
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
      // Seed (SSR now-playing) hrajeme jako PRVNÍ blok — je to aktuální video
      // programu. `/program/now` voláme až PO jeho konci, takže pomalá/selhaná
      // první odpověď enginu (cold start) nezpůsobí safety-bridge (Windy) hned na
      // startu. Konec videa spolehlivě detekuje polling pozice (ne YouTube ENDED).
      let firstSeed: PlayoutBlock | null =
        seed?.videoId && isValidYouTubeVideoId(seed.videoId)
          ? {
              block_id: "seed",
              starts_at: new Date(0).toISOString(),
              ends_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
              expected_ends_at: null,
              video_id: seed.videoId.trim(),
              title: seed.title,
            }
          : null;
      if (!firstSeed) showBridgeNow();

      while (!token.cancelled && enabled) {
        const iterationStart = Date.now();

        if (firstSeed) {
          // Přehraj aktuální (seed) video. Po jeho konci pokračujeme rovnou na
          // /program/now — BEZ handleBlockEnd (seed nemá reálný slot → falešná mezera).
          await playBlock(firstSeed, Math.max(0, Math.floor(seed?.offsetSeconds ?? 0)));
          firstSeed = null;
          if (token.cancelled) return;
          await playScheduledAd("between", seed?.title);
          if (token.cancelled) return;
          continue;
        }

        const now = await fetchProgramNow();
        if (token.cancelled) return;
        if (!now || !isPlayablePlayoutBlock(now.block)) {
          await playSafetyBridge(); // API/prázdno / nehratelný blok → drž obraz živý a zkus znovu
          continue;
        }
        // playBlock přepne na reálný blok (stejné video_id = bez reloadu) a nastaví
        // časovač podle expected_ends_at/ends_at.
        await playBlock(now.block, now.offset_sec);
        if (token.cancelled) return;
        await handleBlockEnd(now.block, now.next_block?.block_id ?? null);

        // Throttle: na hranici bloku (expirovaný blok, mezera ≤5 s) by se smyčka
        // jinak točila bez prodlevy a hamerovala /program/now. Dorovnáme iteraci
        // na MIN_ITERATION_MS (běžné delší bloky tím nejsou dotčené).
        const elapsed = Date.now() - iterationStart;
        if (elapsed < MIN_ITERATION_MS) {
          await waitInterruptible(MIN_ITERATION_MS - elapsed, token, false);
        }
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
