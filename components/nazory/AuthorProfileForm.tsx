"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthorProfilePreview } from "@/components/nazory/AuthorProfilePreview";
import { useAuth } from "@/components/auth/AuthProvider";
import { MAX_AUTHOR_BIO_LENGTH } from "@/lib/nazory/limits";

type ProfilePayload = {
  profile?: {
    firstName: string;
    lastName: string;
    slug: string;
    bio: string | null;
    title: string | null;
    profession: string | null;
    city: string | null;
    websiteUrl: string | null;
    facebookUrl: string | null;
    xUrl: string | null;
    linkedinUrl: string | null;
    contactEmail: string | null;
    avatarUrl: string | null;
    profileCompleted: boolean;
  };
  error?: string;
};

async function activateAuthorAccount(): Promise<boolean> {
  const response = await fetch("/api/nazory/author/activate", {
    method: "POST",
    credentials: "include",
  });
  return response.ok;
}

type AuthorProfileFormProps = {
  redirectOnComplete?: boolean;
  onProfileCompleted?: () => void;
  onSaved?: () => void;
  variant?: "setup" | "edit";
};

export function AuthorProfileForm({
  redirectOnComplete = true,
  onProfileCompleted,
  onSaved,
  variant = "setup",
}: AuthorProfileFormProps = {}) {
  const router = useRouter();
  const { isAuthenticated, openLoginModal, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [slug, setSlug] = useState("autor");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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

  const loadProfile = useCallback(async () => {
    const response = await fetch("/api/nazory/profile", { credentials: "include", cache: "no-store" });
    const payload = (await response.json()) as ProfilePayload;

    if (response.status === 403 || response.status === 404) {
      const isAdminEmail = user?.email?.trim().toLowerCase() === "abjasno@gmail.com";
      if (!isAdminEmail) {
        setError(
          payload.error ??
            "Autorský účet pro vás zatím není aktivní. Pokud vás redakce přidala jako autora, přihlaste se stejným Google účtem, který vám sdělila.",
        );
        return false;
      }
      setActivating(true);
      const activated = await activateAuthorAccount();
      setActivating(false);
      if (!activated) {
        setError(payload.error ?? "Autorský účet se nepodařilo aktivovat. Zkuste se znovu přihlásit.");
        return false;
      }
      return loadProfile();
    }

    if (!response.ok) {
      setError(payload.error ?? "Profil se nepodařilo načíst.");
      return false;
    }

    if (payload.profile) {
      setSlug(payload.profile.slug);
      setAvatarUrl(payload.profile.avatarUrl);
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
    return true;
  }, [user?.email]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void loadProfile().finally(() => setLoading(false));
  }, [isAuthenticated, loadProfile]);

  const updateField = useCallback((key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);

    const response = await fetch("/api/nazory/upload/avatar", {
      method: "POST",
      credentials: "include",
      body,
    });
    const payload = (await response.json()) as { publicUrl?: string; error?: string };
    setUploadingAvatar(false);

    if (!response.ok || !payload.publicUrl) {
      setError(payload.error ?? "Avatar se nepodařilo nahrát.");
      return;
    }

    setAvatarUrl(payload.publicUrl);
    setMessage("Avatar byl nahrán.");
  };

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
    if (payload.profile?.slug) {
      setSlug(payload.profile.slug);
    }
    setMessage("Profil byl uložen.");
    onSaved?.();
    if (payload.profile?.profileCompleted) {
      onProfileCompleted?.();
      if (redirectOnComplete && variant === "setup") {
        router.push("/nazory/napsat");
      }
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

  if (loading || activating) {
    return <p className="nazory-empty">{activating ? "Aktivuji autorský účet…" : "Načítám profil…"}</p>;
  }

  return (
    <div className="nazory-profile-layout">
      <form className="nazory-form" onSubmit={(event) => void handleSubmit(event)}>
        <p className="nazory-form-lead">
          {variant === "edit"
            ? "Upravte svou autorskou kartu, fotku, krátké představení a kontaktní údaje. Jméno a příjmení jsou povinné."
            : "Vyplňte autorskou kartu. Jméno a příjmení jsou povinné. Po uložení můžete napsat první článek."}
        </p>
        {user?.email ? <p className="nazory-form-meta">Přihlášeno jako {user.email}</p> : null}

        <div className="nazory-avatar-upload">
          <span className="nazory-author-avatar nazory-author-avatar--large">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" />
            ) : (
              <span aria-hidden="true">{form.firstName.charAt(0) || "?"}</span>
            )}
          </span>
          <label className="nazory-btn">
            {uploadingAvatar ? "Nahrávám avatar…" : "Nahrát avatar"}
            <input type="file" accept="image/*" className="sr-only" onChange={(event) => void handleAvatarUpload(event)} />
          </label>
        </div>

        <label className="nazory-field">
          <span>Jméno *</span>
          <input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} required />
        </label>
        <label className="nazory-field">
          <span>Příjmení *</span>
          <input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} required />
        </label>
        <label className="nazory-field">
          <span>
            Krátké představení <small>{form.bio.length}/{MAX_AUTHOR_BIO_LENGTH}</small>
          </span>
          <textarea
            value={form.bio}
            maxLength={MAX_AUTHOR_BIO_LENGTH}
            rows={6}
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
          {saving ? "Ukládám…" : variant === "edit" ? "Uložit profil" : "Uložit profil a pokračovat k psaní"}
        </button>
      </form>

      <AuthorProfilePreview
        profile={{
          firstName: form.firstName,
          lastName: form.lastName,
          slug,
          bio: form.bio || null,
          title: form.title || null,
          avatarStoragePath: avatarUrl,
        }}
      />
    </div>
  );
}
