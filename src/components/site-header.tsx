"use client";

import { CalendarDays, ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/brand";
import type { ClubTeam } from "@/lib/sports-hub";

const navigation = [
  { href: "/", label: "Accueil" },
  { href: "/medias", label: "Actualités" },
  { href: "/matchs", label: "Matchs" },
  { href: "/classement", label: "Classement" },
  { href: "/club", label: "Le club" },
  { href: "/academie/inscription", label: "Académie" },
];

export function SiteHeader({
  stripPrimary = "Rabat · Depuis 1969",
  stripSecondary = "Union · Formation · Ambition",
  crestUrl,
  teams,
}: {
  stripPrimary?: string;
  stripSecondary?: string;
  crestUrl?: string;
  teams: ClubTeam[];
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
          <Link className="desktop-more-button" href="/equipes" aria-label="Voir toutes les équipes">
            <Menu aria-hidden="true" size={17} />
          </Link>
          <nav className="desktop-nav" aria-label="Navigation principale">
            {navigation.slice(0, 2).map((item) => (
              <Link
                key={item.href}
                className={pathname === item.href ? "is-active" : undefined}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
            <div className="desktop-nav__teams">
              <Link className={pathname.startsWith("/equipes") ? "is-active" : undefined} href="/equipes">
                Équipes <ChevronDown aria-hidden="true" size={14} />
              </Link>
              <div className="desktop-nav__team-menu">
                <div><small>Le club sur tous les terrains</small><strong>Nos équipes</strong></div>
                {teams.map((team) => <Link href={`/equipes/${team.slug}`} key={team.id}><span>{team.categoryLabel}</span><strong>{team.shortName}</strong></Link>)}
              </div>
            </div>
            {navigation.slice(2).map((item) => (
              <Link key={item.href} className={pathname === item.href ? "is-active" : undefined} href={item.href}>{item.label}</Link>
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
            {navigation.slice(0, 2).map((item, index) => (
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
            <div className="mobile-nav__teams"><span>03</span><strong>Équipes</strong>{teams.map((team) => <Link href={`/equipes/${team.slug}`} key={team.id} onClick={() => setIsOpen(false)}>{team.categoryLabel}</Link>)}</div>
            {navigation.slice(2).map((item, index) => (
              <Link key={item.href} className={pathname === item.href ? "is-active" : undefined} href={item.href} onClick={() => setIsOpen(false)}><span>0{index + 4}</span>{item.label}</Link>
            ))}
          </div>
        </nav>
      </header>
    </>
  );
}