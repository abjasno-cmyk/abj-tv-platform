"use client";

import { useState } from "react";

import type { DayProgram } from "@/lib/epg-types";
import TVPlayer from "@/components/TVPlayer";
import { ProgramCarousel } from "@/components/ProgramCarousel";
import { ChatPanel } from "@/components/ChatPanel";

type LivePageProps = {
  epg: DayProgram[];
  initialVideoId: string | null;
  initialTitle: string;
  initialChannelName: string;
};

export default function LivePage({
  epg,
  initialVideoId,
  initialTitle,
  initialChannelName,
}: LivePageProps) {
  const safeEpg = epg;
  const [videoId, setVideoId] = useState<string | null>(initialVideoId);
  const [title, setTitle] = useState(initialTitle);
  const [channelName, setChannelName] = useState(initialChannelName);

  return (
    <section className="px-6 pt-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <TVPlayer
            videoId={videoId}
            title={title}
            channelName={channelName}
          />
          <ProgramCarousel
            days={safeEpg}
            onVideoSelect={(nextVideoId, nextTitle, nextChannelName) => {
              setVideoId(nextVideoId);
              setTitle(nextTitle);
              setChannelName(nextChannelName);
            }}
          />
        </div>
        <div className="lg:h-full">
          <ChatPanel />
        </div>
      </div>
    </section>
  );
}
