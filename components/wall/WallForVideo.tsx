"use client";

import { WallBoard } from "@/components/wall/WallBoard";

type WallForVideoProps = {
  videoId: string;
  videoTitle?: string | null;
};

export function WallForVideo({ videoId, videoTitle = null }: WallForVideoProps) {
  return (
    <WallBoard
      videoId={videoId}
      videoTitle={videoTitle}
      heading="Reakce diváků na toto video"
      intro="Napište svůj postřeh k právě sledovanému videu."
      compact={true}
      showHero={false}
    />
  );
}

