import { CHANNELS, type Channel } from "../data";
import { HighlightMarker } from "./HighlightMarker";

function monogram(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ChannelTile({ channel }: { channel: Channel }) {
  return (
    <button
      type="button"
      className={`vx-channel ${channel.selected ? "vx-channel--active" : ""}`}
      aria-pressed={channel.selected}
    >
      <span className="vx-channel__logo" aria-hidden="true">
        {monogram(channel.name)}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="truncate text-[0.82rem] font-semibold text-verox-ink" style={{ fontFamily: "var(--vx-sans)" }}>
          {channel.name}
        </span>
        {channel.live ? (
          <>
            <span className="vx-live-dot" aria-hidden="true" />
            <span className="sr-only">živě</span>
          </>
        ) : null}
      </span>
      <span className="vx-meta">{channel.note}</span>
    </button>
  );
}

export function ChannelsRow() {
  return (
    <section id="kanaly" className="vx-shell mt-20">
      <div className="flex items-center justify-center gap-4">
        <hr className="vx-rule-soft hidden flex-1 sm:block" />
        <h2 className="vx-display text-center text-verox-orangeText" style={{ fontSize: "clamp(1.4rem, 2.6vw, 2.1rem)" }}>
          Kanály
        </h2>
        <hr className="vx-rule-soft hidden flex-1 sm:block" />
      </div>

      <div className="mt-7 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {CHANNELS.map((channel) => (
          <ChannelTile key={channel.name} channel={channel} />
        ))}
      </div>

      <p className="mt-6 text-center text-[0.82rem]">
        <HighlightMarker tone="ink">
          <span style={{ fontFamily: "var(--vx-mono)", letterSpacing: "0.1em", textTransform: "uppercase", fontSize: "0.7rem" }}>
            Klikněte na vybraný kanál pro zobrazení detailu
          </span>
        </HighlightMarker>
      </p>
    </section>
  );
}
