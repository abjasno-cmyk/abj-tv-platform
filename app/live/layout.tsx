import type { ReactNode } from "react";

import { ABJNav } from "@/components/abj/Nav";

type LiveLayoutProps = {
  children: ReactNode;
};

export default function LiveLayout({ children }: LiveLayoutProps) {
  return (
    <>
      <ABJNav />
      <div className="pt-[46px]">{children}</div>
    </>
  );
}
