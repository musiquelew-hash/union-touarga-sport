import { CalendarDays, GraduationCap, ShieldCheck, UserPlus, Users } from "lucide-react";
import Image from "next/image";
import { createAcademyGroupAction, createCoachAction, updateEnrollmentAction } from "@/app/academie/actions";
import { AdminNotice } from "@/components/admin/admin-notice";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { academyCategories, enrollmentLabels, enrollmentStatuses, getAcademyCounts, getAcademyRegistrationSettings, listAcademyCoaches, listAcademyEnrollments, listAcademyGroups } from "@/lib/academy";
import { requireAdmin } from "@/lib/admin-auth";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

export default async function AcademyAdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [session, params, counts, coaches, groups, enrollments, registrationSettings] = await Promise.all([
    requireAdmin(), searchParams, getAcademyCounts(), listAcademyCoaches(), listAcademyGroups(), listAcademyEnrollments(), getAcademyRegistrationSettings(),
  ]);

  return (
    <div className="admin-page academy-admin-page">
      <header className="admin-page-heading">
        <div>
          <p className="admin-kicker">Formation et suivi</p>
          <h1>Académie U10–U21</h1>
          <p>Pilotez les candidatures, les groupes, les entraîneurs et le parcours annuel de chaque jeune.</p>
        </div>
      </header>
      <AdminNotice saved={params.saved} error={params.error} />

      <section className="admin-metrics" aria-label="Indicateurs de l’académie">
        <div className="admin-metric"><span>Dossiers à traiter</span><strong>{counts.applications}</strong><small>Candidature, étude ou essai</small><ShieldCheck size={18} /></div>
        <div className="admin-metric"><span>Joueurs actifs</span><strong>{counts.activePlayers}</strong><small>Inscrits cette saison</small><Users size={18} /></div>
        <div className="admin-metric"><span>Groupes actifs</span><strong>{counts.groups}</strong><small>De U10 à U21</small><GraduationCap size={18} /></div>
        <div className="admin-metric"><span>Entraîneurs</span><strong>{counts.coaches}</strong><small>Comptes actifs</small><CalendarDays size={18} /></div>
      </section>

      <div className="academy-admin-grid">
        {session.role === "super_admin" && (
          <section className="admin-panel">
            <div className="admin-panel__heading"><div><span><UserPlus size={16} /></span><h2>Compte entraîneur</h2></div></div>
            <form action={createCoachAction} className="admin-form">
              <label><span>Nom complet</span><input name="name" required /></label>
              <label><span>Nom d’utilisateur</span><input name="username" minLength={3} pattern="[-a-zA-Z0-9._]+" required /></label>
              <label><span>E-mail de connexion</span><input name="email" type="email" required /></label>
              <label><span>Téléphone</span><input name="phone" required /></label>
              <label><span>Mot de passe initial</span><input name="password" type="password" required /></label>
              <label><span>Diplôme / licence</span><input name="licenseLevel" placeholder="CAF B, UEFA B…" /></label>
              <label><span>Spécialité</span><input name="specialty" placeholder="Gardiens, préparation physique…" /></label>
              <AdminSubmitButton className="admin-button admin-button--primary">Créer l’accès entraîneur</AdminSubmitButton>
            </form>
          </section>
        )}

        <section className="admin-panel">
          <div className="admin-panel__heading"><div><span><GraduationCap size={16} /></span><h2>Nouveau groupe</h2></div></div>
          <form action={createAcademyGroupAction} className="admin-form">
            <label><span>Catégorie</span><select name="category">{academyCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label><span>Nom du groupe</span><input name="name" placeholder="Performance U15" required /></label>
            <label><span>Saison</span><input name="season" defaultValue={registrationSettings.seasonLabel} pattern="\d{4}/\d{4}" required /></label>
            <label><span>Capacité</span><input name="capacity" type="number" min="8" max="40" defaultValue="24" required /></label>
            <label><span>Terrain habituel</span><input name="venue" placeholder="Complexe sportif UTS" required /></label>
            <label><span>Entraîneur principal</span><select name="coachId" defaultValue=""><option value="">À affecter</option>{coaches.filter((coach) => coach.active).map((coach) => <option key={coach.id} value={coach.id}>{coach.name}</option>)}</select></label>
            <AdminSubmitButton className="admin-button admin-button--primary">Créer le groupe</AdminSubmitButton>
          </form>
        </section>
      </div>

      <section className="admin-record-list">
        <div className="admin-list-heading"><h2>Dossiers d’inscription</h2><span>{enrollments.length}</span></div>
        {enrollments.length === 0 && <div className="admin-empty-state"><Users size={24} /><p>Aucune candidature pour le moment.</p></div>}
        {enrollments.map((enrollment) => (
          <details className="admin-record" key={enrollment.id}>
            <summary>
              <span className={`academy-status-dot academy-status-dot--${enrollment.status}`} />
              <span><strong>{enrollment.playerName}</strong><small>{enrollment.category} · {enrollment.registrationNumber} · Compte : {enrollment.guardianName}</small></span>
              <span className="admin-record__status">{enrollmentLabels[enrollment.status]}</span>
            </summary>
            <div className="admin-record__body academy-enrollment-body">
              <Image className="academy-player-photo" src={enrollment.photoUrl} alt={enrollment.playerName} width={144} height={180} />
              <div className="academy-enrollment-facts">
                <span>Né(e) le <strong>{formatDate(enrollment.birthDate)}</strong></span>
                <span>Saison <strong>{enrollment.season}</strong></span>
                <span>Contact <strong>{enrollment.guardianPhone}</strong></span>
                <span>E-mail <strong>{enrollment.guardianEmail}</strong></span>
                {enrollment.videoUrl && <span>Vidéo <strong><a href={enrollment.videoUrl} target="_blank" rel="noreferrer">Voir sur YouTube</a></strong></span>}
                {enrollment.identityDocumentAvailable && <span>Identité <strong><a href={`/admin/api/academie/joueurs/${enrollment.playerId}/piece-identite`}>Télécharger la CIN</a></strong></span>}
                {enrollment.medicalNotes && <span className="academy-medical-note">Information médicale : <strong>{enrollment.medicalNotes}</strong></span>}
              </div>
              <form action={updateEnrollmentAction} className="admin-form academy-enrollment-action">
                <input type="hidden" name="enrollmentId" value={enrollment.id} />
                <label><span>Étape du dossier</span><select name="status" defaultValue={enrollment.status}>{enrollmentStatuses.map((status) => <option key={status} value={status}>{enrollmentLabels[status]}</option>)}</select></label>
                <label><span>Groupe affecté</span><select name="groupId" defaultValue={enrollment.groupId || ""}><option value="">Non affecté</option>{groups.filter((group) => group.active && group.category === enrollment.category).map((group) => <option key={group.id} value={group.id}>{group.name} · {group.playerCount}/{group.capacity}</option>)}</select></label>
                <AdminSubmitButton className="admin-button admin-button--primary">Mettre à jour le dossier</AdminSubmitButton>
              </form>
            </div>
          </details>
        ))}
      </section>

      <section className="admin-panel academy-group-list">
        <div className="admin-list-heading"><h2>Groupes et encadrement</h2><span>{groups.length}</span></div>
        {groups.map((group) => <article key={group.id}><strong>{group.category}</strong><span>{group.name}</span><small>{group.season} · {group.coachName || "Entraîneur à affecter"} · {group.playerCount}/{group.capacity} joueurs · {group.venue}</small></article>)}
      </section>
    </div>
  );
}