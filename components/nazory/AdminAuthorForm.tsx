"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthorProfilePreview } from "@/components/nazory/AuthorProfilePreview";
import { getAuthorDisplayName } from "@/lib/nazory/display";
import type { OpinionArticleRow } from "@/lib/nazory/types";

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
  const [articles, setArticles] = useState<OpinionArticleRow[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
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

  const loadArticles = useCallback(async () => {
    setArticlesLoading(true);
    const response = await fetch(`/api/nazory/admin/authors/${encodeURIComponent(userId)}/articles`, {
      credentials: "include",
      cache: "no-store",
    });
    const payload = (await response.json()) as { articles?: OpinionArticleRow[]; error?: string };
    setArticlesLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Články autora se nepodařilo načíst.");
      return;
    }
    setArticles(payload.articles ?? []);
  }, [userId]);

  useEffect(() => {
    void Promise.all([loadAuthor(), loadArticles()]).finally(() => setLoading(false));
  }, [loadAuthor, loadArticles]);

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

  const createArticle = async () => {
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

  const deleteAuthor = async () => {
    if (!window.confirm("Opravdu chcete tohoto autora odstranit? Smažou se i všechny jeho články.")) return;
    const response = await fetch(`/api/nazory/admin/authors/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Autora se nepodařilo odstranit.");
      return;
    }
    router.push("/autori");
  };

  const articleAction = async (articleId: string, action: "hide" | "restore") => {
    setError(null);
    const response = await fetch("/api/nazory/admin/articles", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, action }),
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Akci s článkem se nepodařilo provést.");
      return;
    }
    await loadArticles();
  };

  if (loading) {
    return <p className="nazory-empty">Načítám profil autora…</p>;
  }

  return (
    <div className="nazory-profile-layout">
      <section className="nazory-admin-section nazory-admin-articles" id="clanky">
        <div className="nazory-admin-section-head">
          <h2>Články autora</h2>
          <button type="button" className="nazory-btn nazory-btn-primary" disabled={creatingArticle} onClick={() => void createArticle()}>
            {creatingArticle ? "Vytvářím…" : "Nový článek"}
          </button>
        </div>
        <p className="nazory-form-lead">
          Zde spravujete všechny texty tohoto autora — vytváření, úpravy i skrývání. Po kliknutí na „Upravit“
          otevřete editor jako admin.
        </p>
        {articlesLoading ? (
          <p className="nazory-empty">Načítám články…</p>
        ) : articles.length === 0 ? (
          <p className="nazory-empty">Autor zatím nemá žádné články. Vytvořte první tlačítkem „Nový článek“.</p>
        ) : (
          <ul className="nazory-admin-list">
            {articles.map((article) => (
              <li key={article.id}>
                <span>
                  <strong>{article.title || "Bez názvu"}</strong>
                  <br />
                  <span className="nazory-admin-meta">
                    {article.status === "published" ? "publikováno" : "koncept"}
                    {article.deleted_at ? " · skrytý" : ""}
                    {article.published_at
                      ? ` · ${new Intl.DateTimeFormat("cs-CZ", { timeZone: "Europe/Prague", day: "numeric", month: "numeric", year: "numeric" }).format(new Date(article.published_at))}`
                      : ""}
                  </span>
                </span>
                <span className="nazory-admin-actions">
                  <Link className="nazory-btn nazory-btn-primary" href={`/nazory/napsat/${article.id}`}>
                    Upravit
                  </Link>
                  {article.status === "published" && !article.deleted_at ? (
                    <Link className="nazory-btn" href={`/nazory/${article.slug}`} target="_blank" rel="noopener noreferrer">
                      Zobrazit
                    </Link>
                  ) : null}
                  {article.deleted_at ? (
                    <button type="button" className="nazory-btn" onClick={() => void articleAction(article.id, "restore")}>
                      Obnovit
                    </button>
                  ) : (
                    <button type="button" className="nazory-btn nazory-btn-danger" onClick={() => void articleAction(article.id, "hide")}>
                      Smazat
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form className="nazory-form" onSubmit={(event) => void handleSubmit(event)}>
        <h2 className="nazory-admin-subheading">Autorský profil</h2>
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

      <div className="nazory-editor-actions nazory-admin-danger-zone">
        <button type="button" className="nazory-btn nazory-btn-danger" onClick={() => void deleteAuthor()}>
          Odstranit autora
        </button>
      </div>
    </div>
  );
}
