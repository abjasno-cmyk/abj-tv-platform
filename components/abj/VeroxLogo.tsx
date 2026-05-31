import Link from "next/link";

const LOGO_SRC = "/brand/verox-logo.svg";

type VeroxLogoProps = {
  href?: string;
  className?: string;
};

/** Oficiální logotyp VEROX (SVG z master PDF). */
export function VeroxLogo({ href = "/live", className = "" }: VeroxLogoProps) {
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC}
      alt="VEROX"
      width={400}
      height={120}
      decoding="async"
      className={`verox-logo-img block h-auto w-auto max-w-full object-contain object-left ${className}`.trim()}
    />
  );

  if (!href) {
    return image;
  }

  return (
    <Link href={href} className="inline-flex max-w-full shrink-0" aria-label="Přejít na stránku Živě">
      {image}
    </Link>
  );
}
