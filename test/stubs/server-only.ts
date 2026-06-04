// Test stub for the `server-only` marker package.
//
// In a real build `server-only` throws if a module is bundled for the client.
// It is provided by the Next.js runtime and is not installed as a regular
// node module, so Vitest cannot resolve it. We alias it to this no-op stub
// (see vitest.config.ts) so server modules can be imported under Node.
export {};
