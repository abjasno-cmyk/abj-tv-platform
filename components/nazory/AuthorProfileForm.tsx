"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";

type ProfilePayload = {
  profile?: {
    firstName: string;
    lastName: string;
    bio: string | null;
    title: string | null;
    profession: string | null;
    city: string | null;
    websiteUrl: string | null;
    facebookUrl: string | null;
    xUrl: string | null;
    linkedinUrl: string | null;
    contactEmail: string | null;
    profileCompleted: boolean;
  };
  error?: string;
};

export function AuthorProfileForm() {
  const router = useRouter();
  const { isAuthenticated, openLoginModal } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    title: "",
    profession: "",
    city: "",
    websiteUrl: "",
    facebookUrl: "",
    xUrl: "",
    linkedinUrl: "",
    contactEmail: "",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void fetch("/api/nazory/profile", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as ProfilePayload;
        if (!response.ok) {
          setError(payload.error ?? "Profil se nepodařilo načíst.");
          return;
        }
        if (payload.profile) {
          setForm({
            firstName: payload.profile.firstName ?? "",
            lastName: payload.profile.lastName ?? "",
            bio: payload.profile.bio ?? "",
            title: payload.profile.title ?? "",
            profession: payload.profile.profession ?? "",
            city: payload.profile.city ?? "",
            websiteUrl: payload.profile.websiteUrl ?? "",
            facebookUrl: payload.profile.facebookUrl ?? "",
            xUrl: payload.profile.xUrl ?? "",
            linkedinUrl: payload.profile.linkedinUrl ?? "",
            contactEmail: payload.profile.contactEmail ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const updateField = useCallback((key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) {
      openLoginModal({ reason: "Pro úpravu autorského profilu se přihlaste." });
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/nazory/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = (await response.json()) as ProfilePayload;
    setSaving(false);
    if (!response.ok) {
      setError(payload.error ?? "Profil se nepodařilo uložit.");
      return;
    }
    setMessage("Profil byl uložen.");
    if (payload.profile?.profileCompleted) {
      router.push("/nazory/napsat");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="nazory-panel">
        <p>
          Chcete psát své texty na verox.cz? Napište nám na{" "}
          <a href="mailto:info@abybylojasno.cz">info@abybylojasno.cz</a> — pošlete první článek a domluvíme se.
        </p>
      </div>
    );
  }

  if (loading) {
    return <p className="nazory-empty">Načítám profil…</p>;
  }

  return (
    <form className="nazory-form" onSubmit={(event) => void handleSubmit(event)}>
      <p className="nazory-form-lead">Vyplňte údaje o sobě. Jméno a příjmení jsou povinné.</p>
      <label className="nazory-field">
        <span>Jméno *</span>
        <input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} required />
      </label>
      <label className="nazory-field">
        <span>Příjmení *</span>
        <input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} required />
      </label>
      <label className="nazory-field">
        <span>Krátké představení</span>
        <textarea
          value={form.bio}
          maxLength={500}
          rows={4}
          onChange={(event) => updateField("bio", event.target.value)}
        />
      </label>
      <label className="nazory-field">
        <span>Titul</span>
        <input value={form.title} onChange={(event) => updateField("title", event.target.value)} />
      </label>
      <label className="nazory-field">
        <span>Profese</span>
        <input value={form.profession} onChange={(event) => updateField("profession", event.target.value)} />
      </label>
      <label className="nazory-field">
        <span>Město</span>
        <input value={form.city} onChange={(event) => updateField("city", event.target.value)} />
      </label>
      <label className="nazory-field">
        <span>Web</span>
        <input value={form.websiteUrl} onChange={(event) => updateField("websiteUrl", event.target.value)} />
      </label>
      <label className="nazory-field">
        <span>Facebook</span>
        <input value={form.facebookUrl} onChange={(event) => updateField("facebookUrl", event.target.value)} />
      </label>
      <label className="nazory-field">
        <span>X</span>
        <input value={form.xUrl} onChange={(event) => updateField("xUrl", event.target.value)} />
      </label>
      <label className="nazory-field">
        <span>LinkedIn</span>
        <input value={form.linkedinUrl} onChange={(event) => updateField("linkedinUrl", event.target.value)} />
      </label>
      <label className="nazory-field">
        <span>Kontaktní e-mail (jen interně)</span>
        <input
          type="email"
          value={form.contactEmail}
          onChange={(event) => updateField("contactEmail", event.target.value)}
        />
      </label>
      {error ? <p className="nazory-error">{error}</p> : null}
      {message ? <p className="nazory-success">{message}</p> : null}
      <button type="submit" className="nazory-btn nazory-btn-primary" disabled={saving}>
        {saving ? "Ukládám…" : "Uložit profil"}
      </button>
    </form>
  );
}
