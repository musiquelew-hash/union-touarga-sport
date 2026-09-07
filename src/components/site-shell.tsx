"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { ClubTeam } from "@/lib/sports-hub";

type SiteShellProps = {
  children: ReactNode;
  stripPrimary: string;
  stripSecondary: string;
  footerStatement: string;
  crestWhiteUrl: string;
  teams: ClubTeam[];
};

export function SiteShell({ children, stripPrimary, stripSecondary, footerStatement, crestWhiteUrl, teams }: SiteShellProps) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <main className="admin-main">{children}</main>;
  }

  return (
    <>
      <SiteHeader stripPrimary={stripPrimary} stripSecondary={stripSecondary} crestUrl={crestWhiteUrl} teams={teams} />
      <main>{children}</main>
      <SiteFooter statement={footerStatement} crestUrl={crestWhiteUrl} />
    </>
  );
}