import { Database, ExternalLink, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { AdminMobileHeader, AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/admin-auth";
import { checkCmsConnection } from "@/lib/cms-db";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, databaseReady] = await Promise.all([requireAdmin(), checkCmsConnection()]);

  return (
    <div className="admin-layout">
      <AdminMobileHeader databaseReady={databaseReady} username={session.username} />
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <Image src="/uts/crest-white.png" alt="" width={44} height={52} />
          <div>
            <strong>UTS Admin</strong>
            <span>Centre de gestion</span>
          </div>
        </div>
        <AdminNav />
        <div className="admin-sidebar__footer">
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
          <small>Session : {session.username}</small>
        </div>
      </aside>
      <div className="admin-workspace">
        {!databaseReady && (
          <div className="admin-database-warning">
            MySQL est hors ligne : les contenus éditoriaux ne peuvent pas être modifiés. Matchs et classement restent disponibles via les APIs.
          </div>
        )}
        {children}
      </div>
    </div>
  );
}