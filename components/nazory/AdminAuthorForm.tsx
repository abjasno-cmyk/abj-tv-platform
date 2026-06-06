"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthorProfilePreview } from "@/components/nazory/AuthorProfilePreview";
import { getAuthorDisplayName } from "@/lib/nazory/display";

type AdminAuthorPayload = {
  author?: {
    userId: string;
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
    isActive: boolean;
    accountEmail: string | null;
  };
  error?: string;
};

type AdminAuthorFormProps = {
  userId: string;
};

export function AdminAuthorForm({ userId }: AdminAuthorFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [creatingArticle, setCreatingArticle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [slug, setSlug] = useState("autor");
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileCompleted, setProfileCompleted] = useState(false);
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

  const loadAuthor = useCallback(async () => {
    const response = await fetch(`/api/nazory/admin/authors/${encodeURIComponent(userId)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const payload = (await response.json()) as AdminAuthorPayload;
    if (!response.ok || !payload.author) {
      setError(payload.error ?? "Autora se nepodařilo načíst.");
      return false;
    }

    const author = payload.author;
    setSlug(author.slug);
    setAccountEmail(author.accountEmail);
    setAvatarUrl(author.avatarUrl);
    setProfileCompleted(author.profileCompleted);
    setForm({
      firstName: author.firstName ?? "",
      lastName: author.lastName ?? "",
      bio: author.bio ?? "",
      title: author.title ?? "",
      profession: author.profession ?? "",
      city: author.city ?? "",
      websiteUrl: author.websiteUrl ?? "",
      facebookUrl: author.facebookUrl ?? "",
      xUrl: author.xUrl ?? "",
      linkedinUrl: author.linkedinUrl ?? "",
      contactEmail: author.contactEmail ?? author.accountEmail ?? "",
    });
    setError(null);
    return true;
  }, [userId]);

  useEffect(() => {
    void loadAuthor().finally(() => setLoading(false));
  }, [loadAuthor]);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);

    const response = await fetch(`/api/nazory/admin/authors/${encodeURIComponent(userId)}/avatar`, {
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
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/nazory/admin/authors/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, profileCompleted }),
    });
    const payload = (await response.json()) as AdminAuthorPayload;
    setSaving(false);

    if (!response.ok) {
      setError(payload.error ?? "Profil se nepodařilo uložit.");
      return;
    }

    if (payload.author?.slug) {
      setSlug(payload.author.slug);
    }
    setMessage("Profil autora byl uložen.");
  };

  const createFirstArticle = async () => {
    setCreatingArticle(true);
    setError(null);
    const response = await fetch("/api/nazory/admin/articles", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorId: userId }),
    });
    const payload = (await response.json()) as { article?: { id: string }; error?: string };
    setCreatingArticle(false);

    if (!response.ok || !payload.article) {
      setError(payload.error ?? "Koncept se nepodařilo vytvořit.");
      return;
    }

    router.push(`/nazory/napsat/${payload.article.id}`);
  };

  if (loading) {
    return <p className="nazory-empty">Načítám profil autora…</p>;
  }

  return (
    <div className="nazory-profile-layout">
      <form className="nazory-form" onSubmit={(event) => void handleSubmit(event)}>
        <p className="nazory-form-lead">
          Správa autorského profilu pro{" "}
          <strong>{accountEmail ?? form.contactEmail ?? "neznámý účet"}</strong>. Autor se může přihlásit
          stejným Google účtem a profil si dál spravovat sám.
        </p>

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
          <span>Krátké představení</span>
          <textarea value={form.bio} maxLength={500} rows={4} onChange={(event) => updateField("bio", event.target.value)} />
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
          <span>Kontaktní e-mail (interně)</span>
          <input type="email" value={form.contactEmail} onChange={(event) => updateField("contactEmail", event.target.value)} />
        </label>

        <label className="nazory-field nazory-field-checkbox">
          <input
            type="checkbox"
            checked={profileCompleted}
            onChange={(event) => setProfileCompleted(event.target.checked)}
          />
          <span>Profil považovat za dokončený (zveřejnit autorskou kartu na webu)</span>
        </label>

        <div className="nazory-editor-actions">
          <button type="submit" className="nazory-btn nazory-btn-primary" disabled={saving}>
            {saving ? "Ukládám…" : "Uložit profil autora"}
          </button>
          <button type="button" className="nazory-btn" disabled={creatingArticle} onClick={() => void createFirstArticle()}>
            {creatingArticle ? "Vytvářím koncept…" : "Vytvořit první článek"}
          </button>
          {profileCompleted ? (
            <Link className="nazory-btn" href={`/nazory/autor/${slug}`}>
              Veřejná karta
            </Link>
          ) : null}
        </div>

        {error ? <p className="nazory-error">{error}</p> : null}
        {message ? <p className="nazory-success">{message}</p> : null}
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

      <p className="nazory-form-meta">
        Zobrazené jméno: {getAuthorDisplayName({ first_name: form.firstName, last_name: form.lastName })}
      </p>
    </div>
  );
}
