"use client";

import { useEffect, useState } from "react";

import { isMetaInAppBrowser } from "@/lib/inAppBrowser";

const DISMISS_KEY = "vx_inapp_notice_dismissed";

export function InAppBrowserNotice() {
  const [visible, setVisible] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    try {
      if (!isMetaInAppBrowser(navigator.userAgent)) return;
      if (window.sessionStorage.getItem(DISMISS_KEY)) return;
      setIsAndroid(/Android/i.test(navigator.userAgent));
      setVisible(true);
    } catch {
      // Detekce nesmí nikdy rozbít stránku.
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Private mode bez sessionStorage — banner se příště zobrazí znovu.
    }
  };

  const openInBrowser = () => {
    const { host, pathname, search } = window.location;
    // intent:// otevře odkaz v defaultním prohlížeči místo WebView (Android).
    window.location.href = `intent://${host}${pathname}${search}#Intent;scheme=https;end`;
  };

  return (
    <div
      role="alert"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9999,
        background: "#c2410c",
        color: "#fff",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 14,
        lineHeight: 1.35,
      }}
    >
      <span style={{ flex: 1 }}>
        Otevíráte VEROX v prohlížeči aplikace Facebook — přehrávání videí a přihlášení zde nemusí
        fungovat.{" "}
        {isAndroid ? (
          <button
            type="button"
            onClick={openInBrowser}
            style={{
              background: "#fff",
              color: "#c2410c",
              border: 0,
              borderRadius: 4,
              padding: "4px 10px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Otevřít v prohlížeči
          </button>
        ) : (
          <strong>Klepněte na ⋯ vpravo dole a zvolte „Otevřít v Safari".</strong>
        )}
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Zavřít upozornění"
        style={{
          background: "transparent",
          color: "#fff",
          border: 0,
          fontSize: 20,
          cursor: "pointer",
          padding: "0 4px",
        }}
      >
        ×
      </button>
    </div>
  );
}
