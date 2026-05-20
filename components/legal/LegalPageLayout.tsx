import type { ReactNode } from "react";

type LegalPageLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function LegalPageLayout({ title, subtitle, children }: LegalPageLayoutProps) {
  return (
    <main className="min-h-[calc(100vh-68px)] bg-[#0E1116] px-4 py-8 text-[#E8ECF3] md:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 border-b border-white/10 pb-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#FFB782]">VEROX · právní a informační servis</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight text-white md:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-3 text-sm leading-relaxed text-[#B7BECC]">{subtitle}</p> : null}
        </header>

        <article className="space-y-6 text-sm leading-7 text-[#DCE2EE] md:text-[15px] md:leading-8">{children}</article>
      </div>
    </main>
  );
}
