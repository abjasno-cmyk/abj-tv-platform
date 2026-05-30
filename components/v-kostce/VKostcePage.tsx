"use client";

import { AbjXClient } from "@/app/abj-x/AbjXClient";

import { VKostceMobileFeed } from "@/components/v-kostce/VKostceMobileFeed";

export function VKostcePage() {
  return (
    <div className="verox-vkostce-page">
      <VKostceMobileFeed />
      <div className="verox-live-desktop-only">
        <AbjXClient />
      </div>
    </div>
  );
}
