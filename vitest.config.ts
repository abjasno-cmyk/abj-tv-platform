import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const r = (p: string) => path.resolve(rootDir, p);

export default defineConfig({
  resolve: {
    alias: {
      // Project path alias (mirrors tsconfig "@/*": ["./*"]).
      "@": rootDir,
      // Next/runtime modules that have no meaning outside a Next request — see
      // test/stubs/* for the rationale behind each stub.
      "server-only": r("test/stubs/server-only.ts"),
      "next/headers": r("test/stubs/next-headers.ts"),
      "next/cache": r("test/stubs/next-cache.ts"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["test/**/*.test.ts"],
    // Live Replit tests are opt-in (network + running backend required). They
    // are skipped from the default run and executed via `npm run test:live`.
    exclude: process.env.RUN_REPLIT_LIVE
      ? ["node_modules/**"]
      : ["node_modules/**", "test/live/**"],
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "html", "lcov"],
      include: ["lib/**/*.ts"],
      exclude: [
        "lib/**/*.d.ts",
        "test/**",
        // Exclude data-access heavy modules from coverage gating in this first
        // batch — they need Supabase/network and are covered by route + live
        // tests, not pure unit tests.
        "lib/supabase/**",
      ],
    },
  },
});
