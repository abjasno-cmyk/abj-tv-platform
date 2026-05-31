type VeroxIconName =
  | "sipka"
  | "sipky"
  | "zive-vysilani"
  | "zive-vysilani-dark"
  | "back-to-live"
  | "sound-on"
  | "fullscreen";

const ICON_SRC: Record<VeroxIconName, string> = {
  sipka: "/icons/ikona_sipka.svg",
  sipky: "/icons/ikona_sipky.svg",
  "zive-vysilani": "/icons/ikona_zive_vysilani.svg",
  "zive-vysilani-dark": "/icons/ikona_zive_vysilani02.svg",
  "back-to-live": "/icons/ikona_back_to_life.svg",
  "sound-on": "/icons/ikona_sound_on.svg",
  fullscreen: "/icons/ikona_to_full_scren.svg",
};

type VeroxIconProps = {
  name: VeroxIconName;
  className?: string;
  /** Zrcadlení vlevo (karusel). */
  mirror?: boolean;
  alt?: string;
};

/** Brand ikony VEROX z `public/icons/` (SVG). */
export function VeroxIcon({ name, className = "", mirror = false, alt = "" }: VeroxIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ICON_SRC[name]}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={className}
      style={mirror ? { transform: "scaleX(-1)" } : undefined}
      decoding="async"
    />
  );
}
