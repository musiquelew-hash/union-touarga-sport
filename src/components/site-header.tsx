"use client";

import { CalendarDays, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/brand";

const navigation = [
  { href: "/", label: "Accueil" },
  { href: "/matchs", label: "Matchs" },
  { href: "/equipe", label: "Équipe" },
  { href: "/classement", label: "Classement" },
  { href: "/club", label: "Le club" },
  { href: "/medias", label: "Médias" },
  { href: "/academie/inscription", label: "Académie" },
];

export function SiteHeader({
  stripPrimary = "Rabat · Depuis 1969",
  stripSecondary = "Union · Formation · Ambition",
  crestUrl,
}: {
  stripPrimary?: string;
  stripSecondary?: string;
  crestUrl?: string;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="club-strip">
        <div className="shell club-strip__inner">
          <span>{stripPrimary}</span>
          <span>{stripSecondary}</span>
        </div>
      </div>
      <header className="site-header">
        <div className="shell site-header__inner">
          <Brand compact crestOnly crestUrl={crestUrl} />
          <nav className="desktop-nav" aria-label="Navigation principale">
            {navigation.map((item) => (
              <Link
                key={item.href}
                className={pathname === item.href ? "is-active" : undefined}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link className="header-action" href="/matchs">
            <CalendarDays aria-hidden="true" size={18} />
            Calendrier
          </Link>
          <button
            className="menu-button"
            type="button"
            aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsOpen((current) => !current)}
          >
            {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
        <nav
          className={`mobile-nav${isOpen ? " is-open" : ""}`}
          id="mobile-navigation"
          aria-label="Navigation mobile"
        >
          <div className="shell mobile-nav__inner">
            {navigation.map((item, index) => (
              <Link
                key={item.href}
                className={pathname === item.href ? "is-active" : undefined}
                href={item.href}
                onClick={() => setIsOpen(false)}
              >
                <span>0{index + 1}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
    </>
  );
}