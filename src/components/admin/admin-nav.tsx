"use client";

import {
  Database,
  ExternalLink,
  FileText,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  ShieldCheck,
  UserCog,
  UserRoundCog,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/admin/actions";

const items = [
  { href: "/admin", label: "Vue d’ensemble", icon: LayoutDashboard },
  { href: "/admin/contenu", label: "Contenu du site", icon: FileText },
  { href: "/admin/gestion/player", label: "Joueurs", icon: Users },
  { href: "/admin/gestion/staff", label: "Staff", icon: UserRoundCog },
  { href: "/admin/gestion/news", label: "Actualités", icon: Newspaper },
  { href: "/admin/gestion/media", label: "Médias", icon: Images },
];

export function AdminNav({ isSuperAdmin = false, onNavigate }: { isSuperAdmin?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const visibleItems = [
    ...items,
    ...(isSuperAdmin ? [{ href: "/admin/administrateurs", label: "Administrateurs", icon: ShieldCheck }] : []),
    { href: "/admin/compte", label: "Mon compte", icon: UserCog },
  ];

  return (
    <nav className="admin-nav" aria-label="Navigation de l’administration">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link className={active ? "is-active" : undefined} href={item.href} key={item.href} onClick={onNavigate}>
            <Icon aria-hidden="true" size={18} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminMobileHeader({
  databaseReady,
  isSuperAdmin,
  username,
}: {
  databaseReady: boolean;
  isSuperAdmin: boolean;
  username: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="admin-mobile-header">
      <Link className="admin-mobile-header__brand" href="/admin">
        <Image src="/uts/crest-white.png" alt="" width={34} height={40} />
        <span><strong>UTS Admin</strong><small>Gestion</small></span>
      </Link>
      <span className={`admin-mobile-header__status${databaseReady ? " is-online" : ""}`}>
        <Database aria-hidden="true" size={15} /> MySQL
      </span>
      <button
        aria-controls="admin-mobile-drawer"
        aria-expanded={open}
        aria-label="Ouvrir le menu d’administration"
        className="admin-mobile-header__menu"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Menu aria-hidden="true" size={22} />
      </button>

      {open && (
        <>
          <button
            aria-label="Fermer le menu d’administration"
            className="admin-mobile-overlay"
            onClick={() => setOpen(false)}
            type="button"
          />
          <aside aria-label="Menu d’administration" aria-modal="true" className="admin-mobile-drawer" id="admin-mobile-drawer" role="dialog">
            <div className="admin-mobile-drawer__heading">
              <strong>Navigation</strong>
              <button aria-label="Fermer le menu" onClick={() => setOpen(false)} type="button">
                <X aria-hidden="true" size={21} />
              </button>
            </div>
            <AdminNav isSuperAdmin={isSuperAdmin} onNavigate={() => setOpen(false)} />
            <div className="admin-sidebar__footer admin-mobile-drawer__footer">
              <div className={`admin-db-state${databaseReady ? " is-online" : ""}`}>
                <Database aria-hidden="true" size={16} />
                <span>{databaseReady ? "MySQL connecté" : "MySQL hors ligne"}</span>
              </div>
              <Link href="/" target="_blank">
                <ExternalLink aria-hidden="true" size={16} /> Voir le site
              </Link>
              <form action={logoutAction}>
                <button type="submit">
                  <LogOut aria-hidden="true" size={16} /> Déconnexion
                </button>
              </form>
              <small>Session : {username}</small>
            </div>
          </aside>
        </>
      )}
    </header>
  );
}