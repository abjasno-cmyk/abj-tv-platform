import { afterEach, vi } from "vitest";

// Keep tests isolated from each other: drop any spies/stubs (e.g. global
// `fetch` stubbed in proxy tests) and reset mock state after every test.
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
