import { ExternalLink, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { AdminMobileHeader, AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/admin-auth";
import { checkCmsConnection } from "@/lib/relational-cms-db";
import { getSiteContent } from "@/lib/site-content";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, databaseReady, content] = await Promise.all([
    requireAdmin(),
    checkCmsConnection(),
    getSiteContent(),
  ]);

  return (
    <div className="admin-layout">
      <AdminMobileHeader crestUrl={content.crestWhiteUrl} isSuperAdmin={session.role === "super_admin"} username={session.username} />
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <Image src={content.crestWhiteUrl} alt="" width={44} height={52} />
          <div>
            <strong>Administration</strong>
            <span>Centre de gestion</span>
          </div>
        </div>
        <AdminNav isSuperAdmin={session.role === "super_admin"} />
        <div className="admin-sidebar__footer">
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