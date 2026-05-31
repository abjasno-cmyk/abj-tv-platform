import Image from "next/image";
import Link from "next/link";

const LOGO_SRC = "/brand/verox-logo.png";

type VeroxLogoProps = {
  href?: string;
  className?: string;
  priority?: boolean;
};

export function VeroxLogo({ href = "/live", className = "", priority = true }: VeroxLogoProps) {
  const image = (
    <Image
      src={LOGO_SRC}
      alt="VEROX"
      width={248}
      height={56}
      priority={priority}
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
