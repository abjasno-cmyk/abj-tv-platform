"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { buildSocialShareUrl, type SocialSharePlatform } from "@/lib/share/socialShare";
import { getDictionary } from "@/lib/i18n/dictionary";
import { useLocale } from "@/lib/i18n/useLocale";

const SOCIAL_ITEMS: Array<{ id: SocialSharePlatform; label: string }> = [
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "telegram", label: "Telegram" },
];

type ShareMenuProps = {
  url: string;
  title?: string;
  label?: string;
};

export function ShareMenu({ url, title, label = "Sdílet" }: ShareMenuProps) {
  const dictionary = getDictionary(useLocale());
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !rootRef.current?.contains(target)) {
        closeMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, open]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      closeMenu();
    } catch {
      setCopied(false);
    }
  }, [closeMenu, url]);

  const handleSocialShare = useCallback(
    (platform: SocialSharePlatform) => {
      const shareUrl = buildSocialShareUrl(platform, url, title);
      window.open(shareUrl, "_blank", "noopener,noreferrer");
      closeMenu();
    },
    [closeMenu, title, url],
  );

  return (
    <div className="nazory-share-menu" ref={rootRef}>
      <button
        type="button"
        className="nazory-copy-link nazory-share-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        {copied ? dictionary.common.linkCopied : label === "Sdílet" ? dictionary.common.share : label}
        <span className="nazory-share-menu-chevron" aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <div id={menuId} className="nazory-share-menu-panel" role="menu" aria-label={dictionary.common.share}>
          <button
            type="button"
            className="nazory-share-menu-item"
            role="menuitem"
            onClick={() => void handleCopy()}
          >
            {dictionary.common.copyLink}
          </button>
          {SOCIAL_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="nazory-share-menu-item"
              role="menuitem"
              onClick={() => handleSocialShare(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
