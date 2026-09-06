import { DatabaseBackup, RefreshCw, RotateCcw } from "lucide-react";
import { notFound } from "next/navigation";
import { clearCollectionAction, syncCollectionAction } from "@/app/admin/actions";
import { AdminNotice } from "@/components/admin/admin-notice";
import { AdminNewRecord, AdminRecordEditor } from "@/components/admin/admin-record-form";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { cmsKinds, getCmsCategoryAdminSafe, type CmsKind } from "@/lib/relational-cms-db";
import type {
  MediaSummary,
  NewsSummary,
  PlayerSummary,
  StaffSummary,
} from "@/lib/uts-data";

type RecordData = PlayerSummary | StaffSummary | NewsSummary | MediaSummary;

const sections: Record<CmsKind, { title: string; kicker: string; description: string; empty: string }> = {
  player: {
    title: "Joueurs",
    kicker: "Équipe première",
    description: "Gérez les fiches, postes, photos et statistiques de l’effectif.",
    empty: "Aucun joueur n’est encore publié. Ajoutez-en un ou importez l’effectif de l’ancien site.",
  },
  staff: {
    title: "Staff",
    kicker: "Encadrement",
    description: "Gérez les membres des staffs technique, médical et administratif.",
    empty: "Aucun membre du staff n’est encore publié. Ajoutez-en un ou importez l’ancien site.",
  },
  news: {
    title: "Actualités",
    kicker: "Publications",
    description: "Publiez et ordonnez les articles présentés sur le site.",
    empty: "Aucune actualité n’est encore publiée depuis MySQL.",
  },
  media: {
    title: "Médias",
    kicker: "Vidéos et contenus",
    description: "Gérez les liens vidéo, leurs miniatures et leur ordre d’affichage.",
    empty: "Aucun média n’est encore publié depuis MySQL.",
  },
};

function isCmsKind(value: string): value is CmsKind {
  return (cmsKinds as readonly string[]).includes(value);
}

export default async function AdminCollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [{ kind: rawKind }, query] = await Promise.all([params, searchParams]);
  if (!isCmsKind(rawKind)) notFound();
  const kind = rawKind;
  const collection = await getCmsCategoryAdminSafe<RecordData>(kind);
  const section = sections[kind];

  return (
    <div className="admin-page">
      <header className="admin-page-heading">
        <div>
          <p className="admin-kicker">{section.kicker}</p>
          <h1>{section.title}</h1>
          <p>{section.description}</p>
        </div>
        <div className="admin-heading-actions">
          <form action={syncCollectionAction}>
            <input type="hidden" name="kind" value={kind} />
            <AdminSubmitButton
              className="admin-button admin-button--primary"
              confirmMessage={collection.configured ? "L’import remplacera les modifications de cette rubrique. Continuer ?" : undefined}
              pendingLabel="Import en cours…"
            >
              <RefreshCw aria-hidden="true" size={17} /> Importer l’ancien site
            </AdminSubmitButton>
          </form>
          <form action={clearCollectionAction}>
            <input type="hidden" name="kind" value={kind} />
            <AdminSubmitButton
              className="admin-button admin-button--secondary"
              confirmMessage="Supprimer définitivement tous les éléments de cette rubrique ?"
              disabled={!collection.configured}
              pendingLabel="Réinitialisation…"
            >
              <RotateCcw aria-hidden="true" size={17} /> Vider la rubrique
            </AdminSubmitButton>
          </form>
        </div>
      </header>

      <AdminNotice saved={query.saved} error={query.error} />

      <div className={`admin-source-state${collection.configured ? " is-managed" : ""}`}>
        <DatabaseBackup aria-hidden="true" size={18} />
        <div>
          <strong>Rubrique pilotée par MySQL</strong>
          <span>{collection.records.length} élément{collection.records.length === 1 ? "" : "s"} dans le dashboard</span>
        </div>
      </div>

      <AdminNewRecord kind={kind} />

      <section className="admin-record-list">
        <div className="admin-list-heading">
          <h2>Contenu enregistré</h2>
          <span>{collection.records.length}</span>
        </div>
        {collection.records.length > 0 ? (
          collection.records.map((record) => (
            <AdminRecordEditor kind={kind} record={record} key={record.key} />
          ))
        ) : (
          <div className="admin-empty-state">
            <DatabaseBackup aria-hidden="true" size={24} />
            <p>{section.empty}</p>
          </div>
        )}
      </section>
    </div>
  );
}