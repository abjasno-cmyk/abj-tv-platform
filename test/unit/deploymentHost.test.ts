import { describe, expect, it, vi, afterEach } from "vitest";

async function loadDeploymentHost() {
  vi.resetModules();
  return import("@/lib/deploymentHost");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("isVercelGitBranchPreviewHost", () => {
  it("detects branch preview hosts", async () => {
    const { isVercelGitBranchPreviewHost } = await loadDeploymentHost();
    expect(isVercelGitBranchPreviewHost("abj-tv-platform-n7e8-git-cursor-pr-120.vercel.app")).toBe(true);
  });

  it("does not treat production vercel hostname as git preview", async () => {
    const { isVercelGitBranchPreviewHost } = await loadDeploymentHost();
    expect(isVercelGitBranchPreviewHost("abj-tv-platform-n7e8.vercel.app")).toBe(false);
  });
});

describe("resolveAuthOriginForHost", () => {
  it("keeps git preview host even when VERCEL_ENV is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_CANONICAL_HOST", "www.verox.cz");
    const { resolveAuthOriginForHost } = await loadDeploymentHost();
    expect(resolveAuthOriginForHost("abj-tv-platform-n7e8-git-pr-120.vercel.app", "https:", undefined)).toBe(
      "https://abj-tv-platform-n7e8-git-pr-120.vercel.app",
    );
  });

  it("keeps other legacy vercel deployment hosts", async () => {
    vi.stubEnv("NEXT_PUBLIC_CANONICAL_HOST", "www.verox.cz");
    const { resolveAuthOriginForHost } = await loadDeploymentHost();
    expect(resolveAuthOriginForHost("abj-tv-platform-n7e8-abc123.vercel.app", "https:", "production")).toBe(
      "https://abj-tv-platform-n7e8-abc123.vercel.app",
    );
  });

  it("canonicalizes bare legacy vercel host to verox on production", async () => {
    vi.stubEnv("NEXT_PUBLIC_CANONICAL_HOST", "www.verox.cz");
    const { resolveAuthOriginForHost } = await loadDeploymentHost();
    expect(resolveAuthOriginForHost("abj-tv-platform-n7e8.vercel.app", "https:", "production")).toBe(
      "https://www.verox.cz",
    );
  });

  it("does not canonicalize bare legacy vercel host without production env", async () => {
    vi.stubEnv("NEXT_PUBLIC_CANONICAL_HOST", "www.verox.cz");
    const { resolveAuthOriginForHost } = await loadDeploymentHost();
    expect(resolveAuthOriginForHost("abj-tv-platform-n7e8.vercel.app", "https:", undefined)).toBe(
      "https://abj-tv-platform-n7e8.vercel.app",
    );
  });
});
