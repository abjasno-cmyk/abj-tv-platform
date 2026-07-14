"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Youtube } from "@/components/nazory/tiptapYoutube";
import { hasMeaningfulDraftContent } from "@/lib/nazory/content";
import {
  getOpinionEnglishOriginal,
  stripOpinionEnglishOriginal,
  withOpinionEnglishOriginal,
} from "@/lib/nazory/englishOriginal";
import { extractYoutubeVideoId } from "@/lib/nazory/youtube";

type OpinionEditorProps = {
  articleId?: string;
  initialTitle?: string;
  initialPerex?: string;
  initialContent?: Record<string, unknown>;
  initialStatus?: "draft" | "published";
  publishedSlug?: string | null;
  mode?: "edit" | "preview";
  /** Po vytvoření konceptu nepřesměrovat na /nazory/napsat (např. v Můj VEROX). */
  redirectOnCreate?: boolean;
  previewPathPrefix?: string;
  onDraftSaved?: (articleId: string) => void;
  onDeleted?: () => void;
};

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export function OpinionEditor({
  articleId,
  initialTitle = "",
  initialPerex = "",
  initialContent,
  initialStatus = "draft",
  publishedSlug = null,
  mode = "edit",
  redirectOnCreate = true,
  previewPathPrefix = "/nazory/nahled",
  onDraftSaved,
  onDeleted,
}: OpinionEditorProps) {
  const router = useRouter();
  const initialEnglishOriginal = getOpinionEnglishOriginal(initialContent);
  const [title, setTitle] = useState(initialTitle);
  const [perex, setPerex] = useState(initialPerex);
  const [englishTitle, setEnglishTitle] = useState(initialEnglishOriginal.title);
  const [englishPerex, setEnglishPerex] = useState(initialEnglishOriginal.perex);
  const [currentArticleId, setCurrentArticleId] = useState(articleId ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Placeholder.configure({
        placeholder: "Napište text článku…",
      }),
      Image.configure({
        inline: false,
      }),
      Youtube,
    ],
    content: stripOpinionEnglishOriginal(initialContent ?? EMPTY_DOC),
    editable: mode === "edit",
    immediatelyRender: false,
  });
  const englishEditor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Placeholder.configure({
        placeholder: "Vložte původní anglický text článku…",
      }),
      Image.configure({
        inline: false,
      }),
      Youtube,
    ],
    content: initialEnglishOriginal.contentJson ?? EMPTY_DOC,
    editable: mode === "edit",
    immediatelyRender: false,
  });

  const persistDraft = useCallback(async () => {
    if (!editor || !englishEditor || mode !== "edit") return;

    const baseContentJson = editor.getJSON();
    const englishContentJson = englishEditor.getJSON();
    const contentJson = withOpinionEnglishOriginal(baseContentJson, {
      title: englishTitle,
      perex: englishPerex,
      contentJson: englishContentJson,
    });
    if (
      !currentArticleId &&
      !hasMeaningfulDraftContent(title, perex, baseContentJson) &&
      !hasMeaningfulDraftContent(englishTitle, englishPerex, englishContentJson)
    ) {
      return;
    }

    setSaveState("saving");
    setError(null);

    const payload = {
      title,
      perex,
      contentJson,
    };

    try {
      localStorage.setItem(
        `nazory-draft:${currentArticleId || "new"}`,
        JSON.stringify({ ...payload, savedAt: Date.now() }),
      );
    } catch {
      // Best-effort local backup.
    }

    const response = currentArticleId
      ? await fetch(`/api/nazory/articles/${encodeURIComponent(currentArticleId)}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/nazory/articles", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    const body = (await response.json()) as { article?: { id: string }; error?: string };
    if (!response.ok || !body.article) {
      setSaveState("error");
      setError(body.error ?? "Koncept se nepodařilo uložit.");
      return;
    }

    if (!currentArticleId) {
      setCurrentArticleId(body.article.id);
      if (redirectOnCreate) {
        router.replace(`/nazory/napsat/${body.article.id}`);
      } else {
        onDraftSaved?.(body.article.id);
      }
    }
    setSaveState("saved");
  }, [currentArticleId, editor, englishEditor, englishPerex, englishTitle, mode, onDraftSaved, perex, redirectOnCreate, router, title]);

  useEffect(() => {
    if (!editor || mode !== "edit") return;

    const scheduleSave = () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        void persistDraft();
      }, 5000);
    };

    editor.on("update", scheduleSave);
    englishEditor?.on("update", scheduleSave);
    return () => {
      editor.off("update", scheduleSave);
      englishEditor?.off("update", scheduleSave);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [editor, englishEditor, mode, persistDraft]);

  useEffect(() => {
    if (mode !== "edit") return;
    if (!currentArticleId && !title.trim() && !perex.trim() && !englishTitle.trim() && !englishPerex.trim()) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void persistDraft();
    }, 5000);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [title, perex, englishTitle, englishPerex, mode, persistDraft, currentArticleId]);

  const addLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Vložte odkaz:", previous ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const addYoutube = () => {
    if (!editor) return;
    const url = window.prompt("Vložte odkaz na YouTube video:");
    if (!url) return;
    const videoId = extractYoutubeVideoId(url);
    if (!videoId) {
      window.alert("Odkaz na YouTube se nepodařilo rozpoznat.");
      return;
    }
    editor.chain().focus().insertContent({ type: "youtube", attrs: { videoId, url } }).run();
  };

  const uploadImage = async () => {
    if (!editor) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/gif";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.set("file", file);
      if (currentArticleId) formData.set("articleId", currentArticleId);
      const response = await fetch("/api/nazory/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const payload = (await response.json()) as { path?: string; publicUrl?: string; error?: string };
      if (!response.ok || !payload.path) {
        window.alert(payload.error ?? "Obrázek se nepodařilo nahrát.");
        return;
      }
      editor.chain().focus().setImage({ src: payload.publicUrl ?? payload.path }).run();
    };
    input.click();
  };

  const removeArticle = async () => {
    if (!currentArticleId || deleting) return;
    if (!window.confirm("Opravdu chcete tento článek odstranit? Akci nelze vrátit.")) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/nazory/articles/${encodeURIComponent(currentArticleId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Článek se nepodařilo odstranit.");
        return;
      }
      onDeleted?.();
      if (redirectOnCreate) {
        router.push("/nazory/napsat");
      }
    } catch {
      setError("Článek se nepodařilo odstranit.");
    } finally {
      setDeleting(false);
    }
  };

  const publish = async () => {
    if (!currentArticleId) {
      await persistDraft();
    }
    const id = currentArticleId;
    if (!id) return;
    setPublishing(true);
    setError(null);
    const response = await fetch(`/api/nazory/articles/${encodeURIComponent(id)}/publish`, {
      method: "POST",
      credentials: "include",
    });
    const payload = (await response.json()) as { article?: { slug: string }; error?: string };
    setPublishing(false);
    if (!response.ok || !payload.article) {
      setError(payload.error ?? "Článek se nepodařilo publikovat.");
      return;
    }
    router.push(`/nazory/${payload.article.slug}`);
  };

  if (!editor || !englishEditor) {
    return <p className="nazory-empty">Načítám editor…</p>;
  }

  return (
    <div className={`nazory-editor ${mode === "preview" ? "nazory-editor-preview" : ""}`}>
      <label className="nazory-field">
        <span>Titulek</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          readOnly={mode === "preview"}
          placeholder="Nadpis článku"
        />
      </label>
      <label className="nazory-field">
        <span className="nazory-field-label-row">
          <span>Perex</span>
          <span className="nazory-field-counter" aria-live="polite">
            {perex.length} znaků
          </span>
        </span>
        <textarea
          value={perex}
          rows={4}
          onChange={(event) => setPerex(event.target.value)}
          readOnly={mode === "preview"}
          placeholder="Krátké shrnutí článku"
        />
      </label>

      {mode === "edit" ? (
        <div className="nazory-editor-toolbar" role="toolbar" aria-label="Formátování textu">
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            Nadpis
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            Podnadpis
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}>
            Tučné
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}>
            Kurzíva
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}>
            Odrážky
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            Číslování
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            Citace
          </button>
          <button type="button" onClick={addLink}>
            Odkaz
          </button>
          <button type="button" onClick={() => void uploadImage()}>
            Obrázek
          </button>
          <button type="button" onClick={addYoutube}>
            YouTube
          </button>
        </div>
      ) : null}

      <EditorContent editor={editor} className="nazory-editor-content" />

      <section className="nazory-english-original">
        <div className="nazory-english-original-head">
          <h2>Anglický originál</h2>
          <p>
            Volitelné pole pro texty, které vyšly původně anglicky. Pokud je vyplněné, EN verze webu zobrazí tento ručně
            vložený originál místo české verze.
          </p>
        </div>
        <label className="nazory-field">
          <span>Original English title</span>
          <input
            value={englishTitle}
            onChange={(event) => setEnglishTitle(event.target.value)}
            readOnly={mode === "preview"}
            placeholder="Original title"
          />
        </label>
        <label className="nazory-field">
          <span className="nazory-field-label-row">
            <span>Original English perex</span>
            <span className="nazory-field-counter" aria-live="polite">
              {englishPerex.length} znaků
            </span>
          </span>
          <textarea
            value={englishPerex}
            rows={4}
            onChange={(event) => setEnglishPerex(event.target.value)}
            readOnly={mode === "preview"}
            placeholder="Original short summary"
          />
        </label>
        {mode === "edit" ? (
          <div className="nazory-editor-toolbar" role="toolbar" aria-label="Formátování anglického originálu">
            <button type="button" onClick={() => englishEditor.chain().focus().toggleHeading({ level: 2 }).run()}>
              Heading
            </button>
            <button type="button" onClick={() => englishEditor.chain().focus().toggleHeading({ level: 3 }).run()}>
              Subheading
            </button>
            <button type="button" onClick={() => englishEditor.chain().focus().toggleBold().run()}>
              Bold
            </button>
            <button type="button" onClick={() => englishEditor.chain().focus().toggleItalic().run()}>
              Italic
            </button>
            <button type="button" onClick={() => englishEditor.chain().focus().toggleBulletList().run()}>
              Bullets
            </button>
            <button type="button" onClick={() => englishEditor.chain().focus().toggleOrderedList().run()}>
              Numbered
            </button>
            <button type="button" onClick={() => englishEditor.chain().focus().toggleBlockquote().run()}>
              Quote
            </button>
          </div>
        ) : null}
        <EditorContent editor={englishEditor} className="nazory-editor-content nazory-editor-content-english" />
      </section>

      {mode === "edit" ? (
        <div className="nazory-editor-actions">
          <span className="nazory-editor-status">
            {saveState === "saving"
              ? initialStatus === "published"
                ? "Ukládám změny…"
                : "Ukládám koncept…"
              : null}
            {saveState === "saved"
              ? initialStatus === "published"
                ? "Změny uloženy"
                : "Koncept uložen"
              : null}
            {saveState === "error" ? "Uložení selhalo" : null}
          </span>
          {currentArticleId ? (
            <>
              <button
                type="button"
                className="nazory-btn"
                onClick={() => router.push(`${previewPathPrefix}/${currentArticleId}`)}
              >
                Náhled
              </button>
              <button
                type="button"
                className="nazory-btn nazory-btn-danger"
                disabled={deleting}
                onClick={() => void removeArticle()}
              >
                {deleting ? "Mažu…" : "Odstranit článek"}
              </button>
            </>
          ) : null}
          {initialStatus === "published" ? (
            <>
              <button type="button" className="nazory-btn nazory-btn-primary" onClick={() => void persistDraft()}>
                Uložit změny
              </button>
              {publishedSlug ? (
                <a className="nazory-btn" href={`/nazory/${publishedSlug}`}>
                  Zobrazit článek
                </a>
              ) : null}
            </>
          ) : (
            <button type="button" className="nazory-btn nazory-btn-primary" disabled={publishing} onClick={() => void publish()}>
              {publishing ? "Publikuji…" : "Publikovat"}
            </button>
          )}
        </div>
      ) : null}

      {error ? <p className="nazory-error">{error}</p> : null}
    </div>
  );
}
