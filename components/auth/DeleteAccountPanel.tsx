"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";

const fetchOpts: RequestInit = { credentials: "include", cache: "no-store" };

type AccountDeletionStatus = {
  allowed: boolean;
  reason: string | null;
  contactEmail: string;
  confirmationPhrase: string;
};

export function DeleteAccountPanel() {
  const router = useRouter();
  const { isAuthenticated, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AccountDeletionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setStatus(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/viewer/account", fetchOpts);
      const payload = (await response.json().catch(() => ({}))) as AccountDeletionStatus & { error?: string };
      if (!response.ok) {
        setStatus(null);
        setError(payload.error ?? "Stav účtu se nepodařilo načíst.");
        return;
      }
      setStatus({
        allowed: Boolean(payload.allowed),
        reason: payload.reason ?? null,
        contactEmail: payload.contactEmail ?? "lipovska.hana@seznam.cz",
        confirmationPhrase: payload.confirmationPhrase ?? "SMAZAT",
      });
      setError(null);
    } catch {
      setStatus(null);
      setError("Stav účtu se nepodařilo načíst.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const deleteAccount = async () => {
    if (!status?.allowed || !confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch("/api/viewer/account", {
        ...fetchOpts,
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Účet se nepodařilo smazat.");
        return;
      }

      await signOut();
      router.replace("/?accountDeleted=1");
      router.refresh();
    } catch {
      setError("Účet se nepodařilo smazat.");
    } finally {
      setDeleting(false);
    }
  };

  if (!isAuthenticated) return null;

  const phrase = status?.confirmationPhrase ?? "SMAZAT";
  const canSubmit =
    status?.allowed && confirmed && confirmation.trim() === phrase && !deleting;

  return (
    <section className="mv-account-delete" aria-label="Zrušení účtu">
      <div className="mv-account-delete-head">
        <h2 className="mv-account-delete-title">Nastavení a zrušení účtu</h2>
        <p className="mv-account-delete-lead">
          Můj Verox je <strong>zdarma</strong>. Účet vás nic nestojí — pokud ho ale zrušíte, přijdete o diskusi,
          ukládání videí, oblíbené kanály, rozkoukaná videa a další osobní data.
        </p>
      </div>

      <div className="mv-account-delete-info">
        <p>Rádi účet smažeme, ale možná vám stačí se jen odhlásit a vrátit se později.</p>
        <p>
          Podrobnosti k mazání údajů:{" "}
          <Link href="/data-deletion">Smazání účtu a osobních údajů</Link>
        </p>
      </div>

      {loading ? <p className="mv-account-delete-muted">Načítám možnosti účtu…</p> : null}
      {error ? <p className="mv-account-delete-error">{error}</p> : null}

      {!loading && status && !status.allowed ? (
        <div className="mv-account-delete-blocked" role="status">
          <p>{status.reason}</p>
          <p>
            Napište nám na{" "}
            <a href={`mailto:${status.contactEmail}`}>{status.contactEmail}</a>.
          </p>
        </div>
      ) : null}

      {!loading && status?.allowed ? (
        <div className="mv-account-delete-actions">
          {!open ? (
            <button type="button" className="mv-account-delete-toggle" onClick={() => setOpen(true)}>
              Chci zrušit účet
            </button>
          ) : (
            <div className="mv-account-delete-form">
              <p className="mv-account-delete-warning">
                Tato akce je <strong>trvalá</strong>. Smažeme profil, uložená videa, průběh sledování,
                oblíbené kanály, lajky a komentáře spojené s vaším účtem.
              </p>
              <label className="mv-account-delete-check">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                Rozumím, že ztratím diskusi, ukládání videí a další funkce Můj Verox.
              </label>
              <label className="mv-account-delete-label">
                Pro potvrzení napište <strong>{phrase}</strong>
                <input
                  type="text"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="mv-account-delete-input"
                />
              </label>
              <div className="mv-account-delete-buttons">
                <button
                  type="button"
                  className="mv-account-delete-submit"
                  disabled={!canSubmit}
                  onClick={() => {
                    void deleteAccount();
                  }}
                >
                  {deleting ? "Mažu účet…" : "Trvale smazat účet"}
                </button>
                <button
                  type="button"
                  className="mv-account-delete-cancel"
                  disabled={deleting}
                  onClick={() => {
                    setOpen(false);
                    setConfirmed(false);
                    setConfirmation("");
                    setError(null);
                  }}
                >
                  Nechat účet
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
