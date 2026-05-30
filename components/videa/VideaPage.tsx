"use client";

import { ArchivClient, type ArchivViewData } from "@/app/archiv/ArchivClient";

import { VideaMobileFeed } from "@/components/videa/VideaMobileFeed";

const initialData: ArchivViewData = {
  topForDisplay: [],
  channels: [],
};

export function VideaPage() {
  return (
    <div className="verox-videa-page">
      <VideaMobileFeed />
      <div className="verox-live-desktop-only">
        <ArchivClient initialData={initialData} mode="videa" />
      </div>
    </div>
  );
}
