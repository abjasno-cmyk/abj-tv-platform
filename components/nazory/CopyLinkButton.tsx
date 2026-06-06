"use client";

import { useCallback, useState } from "react";

export function CopyLinkButton({ url, label = "Kopírovat odkaz" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [url]);

  return (
    <button type="button" className="nazory-copy-link" onClick={() => void handleCopy()}>
      {copied ? "Odkaz zkopírován" : label}
    </button>
  );
}
