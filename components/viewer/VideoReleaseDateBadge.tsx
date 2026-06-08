import {
  getVideoReleaseBadgeLabel,
  isScheduledPremiere,
  type VideoReleaseDateSource,
} from "@/lib/viewer/videoReleaseDate";

type VideoReleaseDateBadgeProps = VideoReleaseDateSource & {
  className?: string;
};

export function VideoReleaseDateBadge({
  publishedAt,
  scheduledStartAt,
  videoType,
  className,
}: VideoReleaseDateBadgeProps) {
  const source = { publishedAt, scheduledStartAt, videoType };
  const label = getVideoReleaseBadgeLabel(source);
  if (!label) return null;

  const premiere = isScheduledPremiere(source);
  const classes = [
    "vx-video-release-badge",
    premiere ? "vx-video-release-badge--premiere" : null,
    className ?? null,
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{label}</span>;
}
