import Link from "next/link";

import type { HomeWallPost } from "@/lib/home-sections";
import { SectionLabel } from "@/components/abj/SectionLabel";
import { HeartMark } from "@/components/abj/verox-icons";

type HomeKomunitaProps = { posts: HomeWallPost[] };

function PostBubble({ post }: { post: HomeWallPost }) {
  return (
    <div className="bg-black/20 px-3 py-2 text-sm leading-snug text-white">
      <div className="flex items-center justify-between gap-2">
        <span
          className="block text-[0.62rem] uppercase tracking-[0.12em] opacity-80"
          style={{ fontFamily: "var(--vx-mono)" }}
        >
          {post.author}
        </span>
        {post.likes > 0 ? (
          <span className="inline-flex items-center gap-1 text-[0.62rem] opacity-80" style={{ fontFamily: "var(--vx-mono)" }}>
            <HeartMark size={11} /> {post.likes}
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 line-clamp-3">{post.body}</p>
    </div>
  );
}

// "Komunita" — surfaces the real approved wall posts as a teaser of the live
// chat (the interactive composer lives in the hero band) plus a join CTA.
export function HomeKomunita({ posts }: HomeKomunitaProps) {
  const recent = posts.slice(0, 5);

  return (
    <section id="komunita" className="mt-10">
      <SectionLabel index="(03)" title="Komunita" kicker="Živě v chatu" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(320px,380px)]">
        <div className="flex flex-col justify-between gap-8">
          <p className="max-w-[48ch] text-[1.05rem] leading-relaxed text-verox-charcoal">
            Sledujte vysílání společně. Pište do živého chatu, reagujte na hosty a ptejte se přímo do
            studia — vaše zprávy běží přes obraz vysílání v reálném čase.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/komunita" className="vx-btn vx-btn--solid">
              Připojit se do komunity
            </Link>
            <Link href="/komunita" className="vx-btn">
              Pravidla komunity
            </Link>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden bg-verox-orange text-white">
          <div className="flex items-center justify-between gap-2 px-5 pt-4">
            <span className="vx-display text-[1.4rem] leading-none">Komunita</span>
            <span
              className="text-[0.6rem] uppercase tracking-[0.16em]"
              style={{ fontFamily: "var(--vx-mono)" }}
            >
              Živě v chatu
            </span>
          </div>
          <p
            className="px-5 pt-2 text-[0.7rem] uppercase tracking-[0.2em]"
            style={{ fontFamily: "var(--vx-mono)" }}
          >
            Nejnovější zprávy
          </p>
          <div className="mt-3 flex-1 space-y-2 px-5 pb-5">
            {recent.length > 0 ? (
              recent.map((post) => <PostBubble key={post.id} post={post} />)
            ) : (
              <p className="py-6 text-sm text-white/85">Zatím žádné zprávy — buďte první v chatu.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
