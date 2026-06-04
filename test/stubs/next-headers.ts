// Test stub for `next/headers`.
//
// Server modules under lib/ import `cookies`/`headers` at module load time but
// only invoke them inside request-scoped functions we don't exercise in unit
// tests. We alias next/headers to this stub (see vitest.config.ts) so importing
// those modules does not require a Next.js request context.

type CookieRecord = { name: string; value: string };

function makeCookieStore() {
  const store = new Map<string, string>();
  return {
    getAll(): CookieRecord[] {
      return Array.from(store, ([name, value]) => ({ name, value }));
    },
    get(name: string): CookieRecord | undefined {
      const value = store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set(name: string, value: string): void {
      store.set(name, value);
    },
    delete(name: string): void {
      store.delete(name);
    },
  };
}

export async function cookies() {
  return makeCookieStore();
}

export async function headers() {
  return new Headers();
}

export async function draftMode() {
  return { isEnabled: false, enable() {}, disable() {} };
}
