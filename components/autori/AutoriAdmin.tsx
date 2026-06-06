"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { AuthorProfileRow } from "@/lib/nazory/types";
import { getAuthorDisplayName } from "@/lib/nazory/display";

type AdminAuthorRow = AuthorProfileRow & { account_email?: string | null };

export function AutoriAdmin() {
  const [authors, setAuthors] = useState<AdminAuthorRow[]>([]);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/nazory/admin/authors", { credentials: "include", cache: "no-store" });
    const payload = (await response.json()) as { authors?: AdminAuthorRow[]; error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Nepodařilo se načíst autory.");
      return;
    }
    setAuthors(payload.authors ?? []);
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addAuthor = async () => {
    setMessage(null);
    setError(null);
    const response = await fetch("/api/nazory/admin/authors", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, firstName, lastName, profileCompleted }),
    });
    const payload = (await response.json()) as { author?: AuthorProfileRow; error?: string };
    if (!response.ok || !payload.author) {
      setError(payload.error ?? "Autora se nepodařilo přidat.");
      return;
    }
    setEmail("");
    setFirstName("");
    setLastName("");
    setProfileCompleted(false);
    setMessage("Autor byl vytvořen.");
    window.location.href = `/autori/${payload.author.user_id}#clanky`;
  };

  const toggleAuthor = async (userId: string, isActive: boolean) => {
    await fetch("/api/nazory/admin/authors", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isActive: !isActive }),
    });
    await load();
  };

  return (
    <div className="nazory-admin">
      <section className="nazory-admin-section">
        <h2>Přidat autora</h2>
        <p className="nazory-form-lead">
          Zadejte Google e-mail. Účet připravíme i bez předchozího přihlášení — autor se pak přihlásí stejným Gmailem.
          Vy mu mezitím můžete doplnit profil, fotku a články.
        </p>
        <div className="nazory-admin-create-grid">
          <label className="nazory-field">
            <span>Google e-mail *</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="autor@gmail.com" />
          </label>
          <label className="nazory-field">
            <span>Jméno</span>
            <input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Jan" />
          </label>
          <label className="nazory-field">
            <span>Příjmení</span>
            <input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Novák" />
          </label>
        </div>
        <label className="nazory-field nazory-field-checkbox">
          <input type="checkbox" checked={profileCompleted} onChange={(event) => setProfileCompleted(event.target.checked)} />
          <span>Hned označit profil jako dokončený (zveřejnit autorskou kartu)</span>
        </label>
        <div className="nazory-editor-actions">
          <button type="button" className="nazory-btn nazory-btn-primary" onClick={() => void addAuthor()}>
            Vytvořit autora
          </button>
        </div>
      </section>

      <section className="nazory-admin-section">
        <h2>Autoři</h2>
        <ul className="nazory-admin-list">
          {authors.map((author) => (
            <li key={author.user_id}>
              <span>
                {getAuthorDisplayName(author)} ({author.slug})
                <br />
                <span className="nazory-admin-meta">
                  {author.account_email ?? author.contact_email ?? "bez e-mailu"} —{" "}
                  {author.profile_completed ? "profil hotový" : "profil nedokončený"} —{" "}
                  {author.is_active ? "aktivní" : "deaktivovaný"}
                </span>
              </span>
              <span className="nazory-admin-actions">
                <Link className="nazory-btn nazory-btn-primary" href={`/autori/${author.user_id}#clanky`}>
                  Spravovat
                </Link>
                <button type="button" className="nazory-btn" onClick={() => void toggleAuthor(author.user_id, author.is_active)}>
                  {author.is_active ? "Deaktivovat" : "Obnovit"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {error ? <p className="nazory-error">{error}</p> : null}
      {message ? <p className="nazory-success">{message}</p> : null}
    </div>
  );
}
