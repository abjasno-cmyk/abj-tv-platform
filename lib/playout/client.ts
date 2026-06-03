import type {
  FillGapResponse,
  ProgramNowResponse,
  SafetyBridgeResponse,
} from "@/lib/playout/types";

// Engine voláme přes interní proxy /api/replit/* — ta doplní X-Api-Key na serveru,
// takže klíč nikdy neopustí backend. Query params (fill-gap) proxy přeposílá.
const PROXY_BASE = "/api/replit/program";
const DEFAULT_TIMEOUT_MS = 8000;

// Lokální nouzový boundary, když i safety-bridge selže (síť/timeout). Nikdy nevyhazuje.
const LOCAL_SAFETY_BRIDGE: SafetyBridgeResponse = {
  schema_version: "safety-bridge.local",
  block: { type: "boundary", duration_sec: 30, title: "ABJ — pokračujeme", purpose: "safety_bridge" },
};

async function fetchJson<T>(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// Co hrát teď + co dál. Vrací null při chybě (volající přepne na safety-bridge).
export async function fetchProgramNow(): Promise<ProgramNowResponse | null> {
  try {
    return await fetchJson<ProgramNowResponse>(`${PROXY_BASE}/now`);
  } catch {
    return null;
  }
}

export interface FillGapParams {
  seconds: number;
  currentBlockId?: string | null;
  nextBlockId?: string | null;
}

// Řetěz výplní pokrývající mezeru do dalšího pevného bloku. Null při chybě.
export async function fetchFillGap(params: FillGapParams): Promise<FillGapResponse | null> {
  const query = new URLSearchParams();
  query.set("seconds", String(Math.max(0, Math.floor(params.seconds))));
  if (params.currentBlockId) query.set("current_block_id", params.currentBlockId);
  if (params.nextBlockId) query.set("next_block_id", params.nextBlockId);
  try {
    return await fetchJson<FillGapResponse>(`${PROXY_BASE}/fill-gap?${query.toString()}`);
  } catch {
    return null;
  }
}

// Krajní pojistka. NIKDY nevyhazuje — při selhání vrátí lokální boundary ident.
export async function fetchSafetyBridge(): Promise<SafetyBridgeResponse> {
  try {
    const data = await fetchJson<SafetyBridgeResponse>(`${PROXY_BASE}/safety-bridge`, 6000);
    if (!data?.block || typeof data.block.duration_sec !== "number") {
      return LOCAL_SAFETY_BRIDGE;
    }
    return data;
  } catch {
    return LOCAL_SAFETY_BRIDGE;
  }
}
