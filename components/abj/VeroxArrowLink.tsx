import Link from "next/link";

import { VeroxIcon } from "@/components/abj/VeroxIcon";

type VeroxArrowLinkProps = {
  href: string;
  label?: string;
  className?: string;
};

export function VeroxArrowLink({ href, label = "Zjistit více", className = "" }: VeroxArrowLinkProps) {
  return (
    <Link
      href={href}
      className={`verox-videa-cta verox-font-myriad-bold inline-flex w-full items-center gap-[2vw] uppercase tracking-[0.05em] text-[#303030] ${className}`.trim()}
    >
      <span>{label}</span>
      <VeroxIcon name="sipka" className="h-[clamp(14px,3vw,20px)] w-auto shrink-0" />
    </Link>
  );
}
