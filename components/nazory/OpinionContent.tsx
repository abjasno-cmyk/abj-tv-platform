import type { ReactNode } from "react";

import { extractYoutubeVideoId } from "@/lib/nazory/youtube";
import { publicNazoryMediaUrl } from "@/lib/nazory/media";

type TipTapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
  content?: TipTapNode[];
};

function renderMarks(text: string, marks: TipTapNode["marks"]): ReactNode {
  if (!marks?.length) return text;
  return marks.reduce<ReactNode>((node, mark) => {
    if (mark.type === "bold") return <strong>{node}</strong>;
    if (mark.type === "italic") return <em>{node}</em>;
    if (mark.type === "link") {
      const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : "#";
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {node}
        </a>
      );
    }
    return node;
  }, text);
}

function renderInline(node: TipTapNode, key: string): ReactNode {
  if (node.type === "text") {
    return <span key={key}>{renderMarks(node.text ?? "", node.marks)}</span>;
  }
  if (node.type === "hardBreak") {
    return <br key={key} />;
  }
  return null;
}

function renderBlock(node: TipTapNode, key: string): ReactNode {
  const children = (node.content ?? []).map((child, index) =>
    child.type === "text" || child.type === "hardBreak"
      ? renderInline(child, `${key}-inline-${index}`)
      : renderBlock(child, `${key}-block-${index}`),
  );

  switch (node.type) {
    case "paragraph":
      return (
        <p key={key} className="nazory-prose-p">
          {children}
        </p>
      );
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      if (level === 3) {
        return (
          <h3 key={key} className="nazory-prose-h3">
            {children}
          </h3>
        );
      }
      return (
        <h2 key={key} className="nazory-prose-h2">
          {children}
        </h2>
      );
    }
    case "bulletList":
      return (
        <ul key={key} className="nazory-prose-ul">
          {children}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="nazory-prose-ol">
          {children}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return (
        <blockquote key={key} className="nazory-prose-quote">
          {children}
        </blockquote>
      );
    case "image": {
      const src = publicNazoryMediaUrl(
        typeof node.attrs?.src === "string" ? node.attrs.src : null,
      );
      if (!src) return null;
      return (
        <figure key={key} className="nazory-prose-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={typeof node.attrs?.alt === "string" ? node.attrs.alt : ""} loading="lazy" />
        </figure>
      );
    }
    case "youtube": {
      const videoId =
        (typeof node.attrs?.videoId === "string" ? node.attrs.videoId : null) ??
        extractYoutubeVideoId(typeof node.attrs?.url === "string" ? node.attrs.url : "");
      if (!videoId) return null;
      return (
        <div key={key} className="nazory-prose-youtube">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`}
            title="YouTube video"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    default:
      return children.length > 0 ? <div key={key}>{children}</div> : null;
  }
}

export function OpinionContent({ content }: { content: Record<string, unknown> }) {
  const root = content as TipTapNode;
  const blocks = root.content ?? [];
  if (blocks.length === 0) {
    return <p className="nazory-empty">Článek zatím nemá obsah.</p>;
  }

  return <div className="nazory-prose">{blocks.map((block, index) => renderBlock(block, `block-${index}`))}</div>;
}
