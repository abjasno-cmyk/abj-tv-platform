import Link from "next/link";

type VeroxArrowLinkProps = {
  href: string;
  label?: string;
  className?: string;
};

export function VeroxArrowLink({ href, label = "Zjistit více", className = "" }: VeroxArrowLinkProps) {
  return (
    <Link
      href={href}
      className={`verox-videa-cta verox-font-myriad-bold inline-flex w-full items-center justify-between gap-2 uppercase tracking-[0.05em] text-[#303030] ${className}`.trim()}
    >
      <span>{label}</span>
      <span className="verox-videa-cta-arrow relative ml-2 inline-flex h-[10px] min-w-[42%] flex-1 items-center" aria-hidden="true">
        <span className="block h-[2px] w-full bg-[#F37021]" />
        <span className="absolute right-0 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[5px] border-l-[8px] border-y-transparent border-l-[#F37021]" />
      </span>
    </Link>
  );
}
