"use client";

import { isVercelGitBranchPreviewHost } from "@/lib/deploymentHost";

export function PreviewAuthNotice() {
  if (typeof window === "undefined") return null;
  if (!isVercelGitBranchPreviewHost(window.location.host)) return null;

  return (
    <aside className="nazory-preview-auth-notice" role="note">
      <strong>Preview přihlášení:</strong> po Google/Facebook loginu by vás měl systém vrátit zpět sem
      (ne na www.verox.cz). Pokud to nefunguje, kontaktujte správce — na produkci musí být nasazená
      podpora preview handoff v <code>/auth/callback</code>.
    </aside>
  );
}
