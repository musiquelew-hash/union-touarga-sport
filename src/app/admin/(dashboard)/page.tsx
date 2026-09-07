import { ArrowRight, GraduationCap, LayoutGrid, RefreshCw, Trophy } from "lucide-react";
import Link from "next/link";
import { runInitialContentImportAction } from "@/app/admin/actions";
import { AdminNotice } from "@/components/admin/admin-notice";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { requireAdmin } from "@/lib/admin-auth";
import { getInitialContentImportStatusSafe } from "@/lib/initial-content-import";
import { getAcademyCountsSafe } from "@/lib/academy";
import { getCmsCountsSafe, isCmsDatabaseConfigured } from "@/lib/relational-cms-db";

const modules = [
  { kind: "player", label: "Joueurs", href: "/admin/gestion/player", description: "Effectif et statistiques" },
  { kind: "staff", label: "Staff", href: "/admin/gestion/staff", description: "Encadrement du club" },
  { kind: "news", label: "Actualités", href: "/admin/gestion/news", description: "Publications officielles" },
  { kind: "media", label: "Médias", href: "/admin/gestion/media", description: "Vidéos et liens sociaux" },
] as const;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [counts, academyCounts, params, session, importStatus] = await Promise.all([
    getCmsCountsSafe(),
    getAcademyCountsSafe(),
    searchParams,
    requireAdmin(),
    getInitialContentImportStatusSafe(),
  ]);
  const databaseConfigured = isCmsDatabaseConfigured();
  const canImport = session.role === "super_admin" && importStatus !== "completed";

  return (
    <div className="admin-page">
      <header className="admin-page-heading">
        <div>
          <p className="admin-kicker">Pilotage éditorial</p>
          <h1>Vue d’ensemble</h1>
          <p>Gérez les contenus du club, les publications et les données sportives depuis un espace unique.</p>
        </div>
        {canImport && (
          <form action={runInitialContentImportAction}>
            <AdminSubmitButton
              className="admin-button admin-button--primary"
              confirmMessage="Cet import initial ne pourra être exécuté qu’une seule fois. Continuer ?"
              disabled={!databaseConfigured || importStatus === "running"}
              pendingLabel="Import en cours…"
            >
              <RefreshCw aria-hidden="true" size={17} /> Remplir le site une première fois
            </AdminSubmitButton>
          </form>
        )}
      </header>

      <AdminNotice saved={params.saved} error={params.error} />

      {importStatus === "completed" && params.saved !== "imported" && (
        <div className="admin-notice admin-notice--success" role="status">
          L’import initial est terminé. Les contenus sont maintenant gérés uniquement depuis ce dashboard.
        </div>
      )}

      <section className="admin-metrics" aria-label="Résumé des contenus gérés">
        {modules.map((module) => (
          <Link className="admin-metric" href={module.href} key={module.kind}>
            <span>{module.label}</span>
            <strong>{counts[module.kind]}</strong>
            <small>{module.description}</small>
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        ))}
      </section>

      <section className="admin-panel admin-source-panel">
        <div className="admin-panel__icon"><GraduationCap aria-hidden="true" size={24} /></div>
        <div>
          <h2>Académie U10–U21</h2>
          <p>{academyCounts.applications} dossier(s) en cours, {academyCounts.activePlayers} joueur(s) actif(s), {academyCounts.groups} groupe(s) et {academyCounts.coaches} entraîneur(s).</p>
        </div>
        <Link className="admin-button admin-button--secondary" href="/admin/academie">
          Piloter l’académie <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </section>

      <section className="admin-panel admin-source-panel">
        <div className="admin-panel__icon"><Trophy aria-hidden="true" size={24} /></div>
        <div>
          <h2>Toutes les équipes, un seul centre</h2>
          <p>Équipe masculine, féminine et formation disposent de leurs calendriers, résultats, classements et sources API.</p>
        </div>
        <Link className="admin-button admin-button--secondary" href="/admin/sport">
          Ouvrir le centre sportif <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </section>

      <section className="admin-panel admin-source-panel">
        <div className="admin-panel__icon"><LayoutGrid aria-hidden="true" size={24} /></div>
        <div>
          <h2>Un pilotage centralisé</h2>
          <p>
            Joueurs, staff, actualités, médias et textes sont gérés ici. Les éléments masqués restent conservés mais
            disparaissent du site public. Le calendrier, les résultats et le classement restent synchronisés automatiquement.
          </p>
        </div>
        <Link className="admin-button admin-button--secondary" href="/admin/contenu">
          Modifier les textes <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </section>
    </div>
  );
}