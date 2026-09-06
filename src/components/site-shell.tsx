"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

type SiteShellProps = {
  children: ReactNode;
  stripPrimary: string;
  stripSecondary: string;
  footerStatement: string;
  crestWhiteUrl: string;
};

export function SiteShell({ children, stripPrimary, stripSecondary, footerStatement, crestWhiteUrl }: SiteShellProps) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <main className="admin-main">{children}</main>;
  }

  return (
    <>
      <SiteHeader stripPrimary={stripPrimary} stripSecondary={stripSecondary} crestUrl={crestWhiteUrl} />
      <main>{children}</main>
      <SiteFooter statement={footerStatement} crestUrl={crestWhiteUrl} />
    </>
  );
}