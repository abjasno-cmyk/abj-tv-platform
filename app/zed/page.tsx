import { WallBoard } from "@/components/wall/WallBoard";

export const dynamic = "force-dynamic";

export default async function ZedPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawVideoId = resolvedSearchParams?.video_id;
  const rawVideoTitle = resolvedSearchParams?.video_title;
  const videoId = Array.isArray(rawVideoId) ? rawVideoId[0] : rawVideoId;
  const videoTitle = Array.isArray(rawVideoTitle) ? rawVideoTitle[0] : rawVideoTitle;
  return (
    <WallBoard
      heading="Zeď diváků"
      intro="Tohle je místo pro vaše vzkazy, postřehy a reakce na pořady ABJ. Pište slušně, věcně a pod svou přezdívkou."
      videoId={videoId ?? null}
      videoTitle={videoTitle ?? null}
      showHero={true}
    />
  );
}

