import type { ReactNode } from "react";

type LiveLayoutProps = {
  children: ReactNode;
};

export default function LiveLayout({ children }: LiveLayoutProps) {
  return <>{children}</>;
}
