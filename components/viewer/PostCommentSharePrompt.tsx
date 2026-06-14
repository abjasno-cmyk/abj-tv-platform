"use client";

import { useCallback, useEffect, useState } from "react";

import { ShareMenu } from "@/components/nazory/ShareMenu";

const SNOOZE_KEY = "verox_comment_share_snooze_until";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function isSharePromptSnoozed(): boolean {
  try {
    const raw = window.localStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    const until = Number.parseInt(raw, 10);
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

function snoozeSharePrompt(): void {
  try {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  } catch {
    // Ignore storage failures.
  }
}

type PostCommentSharePromptProps = {
  shareUrl: string;
  shareTitle?: string;
  onDismiss?: () => void;
};

export function PostCommentSharePrompt({ shareUrl, shareTitle, onDismiss }: PostCommentSharePromptProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isSharePromptSnoozed());
  }, []);

  const dismiss = useCallback(() => {
    snoozeSharePrompt();
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div className="vx-comment-share-prompt" role="status">
      <p className="vx-comment-share-prompt-text">
        Líbí se vám ta diskuze? <strong>Pošlete ji přátelům</strong> — možná se taky zapojí.
      </p>
      <div className="vx-comment-share-prompt-actions">
        <ShareMenu url={shareUrl} title={shareTitle} label="Sdílet" />
        <button type="button" className="vx-comment-share-prompt-dismiss" onClick={dismiss}>
          Teď ne
        </button>
      </div>
    </div>
  );
}
