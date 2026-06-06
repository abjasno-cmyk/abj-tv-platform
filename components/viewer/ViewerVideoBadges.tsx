type ViewerVideoBadgesProps = {
  watched?: boolean;
  saved?: boolean;
};

export function ViewerVideoBadges({ watched = false, saved = false }: ViewerVideoBadgesProps) {
  if (!watched && !saved) return null;

  return (
    <span className="vx-video-badges">
      {saved ? <span className="vx-video-badge vx-video-badge--saved">Uloženo</span> : null}
      {watched ? <span className="vx-video-badge vx-video-badge--watched">Zhlédnuto</span> : null}
    </span>
  );
}
