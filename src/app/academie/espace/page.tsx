import { CalendarDays, CheckSquare2, Clock3, LogOut, MapPin, MessageSquareText, Plus, Users } from "lucide-react";
import Image from "next/image";
import { academyLogoutAction, createCoachNoteAction, createTrainingSessionAction, registerAdditionalPlayerAction, saveAttendanceAction } from "@/app/academie/actions";
import { AcademyNotice } from "@/components/academy-notice";
import { enrollmentLabels, getCoachDashboard, getGuardianDashboard } from "@/lib/academy";
import { requireAcademyAccount } from "@/lib/academy-auth";

export const metadata = { title: "Mon espace Académie" };

function dateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default async function AcademyWorkspacePage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; registered?: string }> }) {
  const [account, params] = await Promise.all([requireAcademyAccount(), searchParams]);
  const data = account.role === "coach" ? await getCoachDashboard(account.id) : await getGuardianDashboard(account.id);
  const workspaceLabel = account.role === "coach" ? "entraîneur" : account.role === "player" ? "joueur" : "famille";

  return (
    <div className="academy-shell academy-workspace">
      <header className="academy-workspace-header">
        <div><p className="academy-eyebrow">Espace {workspaceLabel}</p><h1>Bonjour, {account.displayName}</h1><p>{account.role === "coach" ? "Planifiez les séances et accompagnez la progression de vos groupes." : "Suivez les dossiers, créneaux et retours de l’encadrement."}</p></div>
        <form action={academyLogoutAction}><button className="academy-button academy-button--ghost" type="submit"><LogOut size={17} /> Déconnexion</button></form>
      </header>
      <AcademyNotice error={params.error} saved={params.saved} registered={params.registered} />

      {account.role === "coach" ? <CoachWorkspace data={data as Awaited<ReturnType<typeof getCoachDashboard>>} /> : <GuardianWorkspace canAddChildren={account.role === "guardian"} data={data as Awaited<ReturnType<typeof getGuardianDashboard>>} />}
    </div>
  );
}

function GuardianWorkspace({ data, canAddChildren }: { data: Awaited<ReturnType<typeof getGuardianDashboard>>; canAddChildren: boolean }) {
  return <>
    <section className="academy-section-heading"><div><Users size={22} /><h2>{canAddChildren ? "Mes jeunes" : "Mon dossier"}</h2></div><span>{data.players.length}</span></section>
    <div className="academy-player-grid">
      {data.players.map((player) => <article className="academy-player-card" key={player.id}>
        <Image src={player.photoUrl} alt={player.name} width={120} height={150} />
        <div><span className={`academy-status academy-status--${player.status}`}>{enrollmentLabels[player.status]}</span><h3>{player.name}</h3><p>{player.category} · {player.groupName || "Groupe à affecter"}</p><small>{player.registrationNumber} · Saison {player.season}</small></div>
      </article>)}
    </div>
    {canAddChildren && <details className="academy-section academy-add-player">
      <summary><Plus size={17} /> Inscrire un autre enfant</summary>
      <form action={registerAdditionalPlayerAction} className="academy-form">
        <div className="academy-form-grid">
          <label><span>Prénom</span><input name="firstName" required /></label><label><span>Nom</span><input name="lastName" required /></label>
          <label><span>Date de naissance</span><input name="birthDate" type="date" required /></label><label><span>Genre</span><select name="gender"><option value="male">Garçon</option><option value="female">Fille</option></select></label>
          <label><span>Lien familial</span><select name="relationship"><option>Parent</option><option>Tuteur légal</option></select></label><label><span>Nationalité</span><input name="nationality" defaultValue="Maroc" required /></label>
          <label><span>Établissement scolaire</span><input name="schoolName" /></label><label><span>Pied préféré</span><select name="preferredFoot" defaultValue="unknown"><option value="unknown">À déterminer</option><option value="right">Droit</option><option value="left">Gauche</option><option value="both">Les deux</option></select></label>
          <label><span>Photo récente</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
          <label className="is-wide"><span>Vidéo YouTube de candidature</span><input name="videoUrl" type="url" placeholder="https://youtu.be/..." /></label>
          <label className="is-wide"><span>Informations médicales</span><textarea name="medicalNotes" rows={3} /></label>
        </div>
        <label className="academy-check"><input name="consentMedical" type="checkbox" required /><span>J’autorise l’encadrement à utiliser ces informations pour la sécurité du joueur.</span></label>
        <label className="academy-check"><input name="consentImage" type="checkbox" /><span>J’autorise l’utilisation de son image.</span></label>
        <button className="academy-button academy-button--primary" type="submit">Transmettre le dossier</button>
      </form>
    </details>}
    <Schedule sessions={data.sessions} />
    <section className="academy-section"><div className="academy-section-heading"><div><MessageSquareText size={22} /><h2>Retours de l’encadrement</h2></div></div>
      <div className="academy-feed">{data.notes.length ? data.notes.map((note) => <article key={note.id}><strong>{note.playerName} · {note.category}</strong><p>{note.text}</p><small>{note.authorName} · {dateTime(note.createdAt)}</small></article>) : <p className="academy-empty">Aucune remarque partagée pour le moment.</p>}</div>
    </section>
  </>;
}

function CoachWorkspace({ data }: { data: Awaited<ReturnType<typeof getCoachDashboard>> }) {
  return <>
    <div className="academy-coach-grid">
      <section className="academy-section academy-action-panel">
        <div className="academy-section-heading"><div><CalendarDays size={22} /><h2>Nouveau créneau</h2></div></div>
        <form action={createTrainingSessionAction} className="academy-form">
          <label><span>Groupe</span><select name="groupId" required>{data.groups.map((group) => <option value={group.id} key={group.id}>{group.category} · {group.name}</option>)}</select></label>
          <div className="academy-form-grid"><label><span>Début</span><input name="startsAt" type="datetime-local" required /></label><label><span>Fin</span><input name="endsAt" type="datetime-local" required /></label></div>
          <label><span>Terrain</span><input name="venue" required /></label><label><span>Objectif de séance</span><input name="focus" required /></label>
          <button className="academy-button academy-button--primary" disabled={!data.groups.length} type="submit"><Plus size={17} /> Publier le créneau</button>
        </form>
      </section>
      <section className="academy-section academy-action-panel">
        <div className="academy-section-heading"><div><MessageSquareText size={22} /><h2>Observation joueur</h2></div></div>
        <form action={createCoachNoteAction} className="academy-form">
          <label><span>Joueur</span><select name="playerId" required>{data.players.map((player) => <option value={player.id} key={player.id}>{player.name} · {player.category}</option>)}</select></label>
          <div className="academy-form-grid"><label><span>Catégorie</span><select name="category"><option value="sport">Sportif</option><option value="behavior">Comportement</option><option value="medical">Médical</option><option value="administrative">Administratif</option></select></label><label><span>Visibilité</span><select name="visibility"><option value="guardian">Partager avec la famille</option><option value="staff_only">Staff uniquement</option></select></label></div>
          <label><span>Remarque</span><textarea name="note" rows={4} required /></label>
          <button className="academy-button academy-button--primary" disabled={!data.players.length} type="submit"><Plus size={17} /> Ajouter l’observation</button>
        </form>
      </section>
    </div>
    <section className="academy-section"><div className="academy-section-heading"><div><Users size={22} /><h2>Mes groupes et joueurs</h2></div><span>{data.players.length}</span></div>
      <div className="academy-roster">{data.groups.map((group) => <article key={group.id}><header><strong>{group.category}</strong><div><h3>{group.name}</h3><p>{group.venue} · {group.playerCount}/{group.capacity} joueurs</p></div></header>{data.players.filter((player) => player.groupId === group.id).map((player) => <div className="academy-roster-player" key={player.id}><Image src={player.photoUrl} alt="" width={42} height={52} /><span><strong>{player.name}</strong><small>{enrollmentLabels[player.status]} · {player.registrationNumber}</small>{player.medicalNotes && <small className="academy-roster-player__medical">Médical : {player.medicalNotes}</small>}</span></div>)}</article>)}</div>
    </section>
    <Schedule sessions={data.sessions} />
    <section className="academy-section">
      <div className="academy-section-heading"><div><CheckSquare2 size={22} /><h2>Feuilles de présence</h2></div></div>
      <div className="academy-attendance-list">
        {data.sessions.map((session) => {
          const players = data.players.filter((player) => player.groupId === session.groupId);
          const canRecord = new Date(session.endsAt) <= new Date();
          return <details key={session.id}><summary><span><strong>{session.groupName}</strong><small>{dateTime(session.startsAt)} · {session.focus}</small></span><span>{session.status === "completed" ? "Clôturée" : "À saisir"}</span></summary>
            {canRecord ? <form action={saveAttendanceAction} className="academy-attendance-form"><input name="sessionId" type="hidden" value={session.id} />
              {players.map((player) => <label key={player.id}><span>{player.name}</span><select name={`attendance-${player.id}`} defaultValue={data.attendance.find((entry) => entry.sessionId === session.id && entry.playerId === player.id)?.status || "present"}><option value="present">Présent</option><option value="late">En retard</option><option value="absent">Absent</option><option value="excused">Excusé</option></select></label>)}
              <button className="academy-button academy-button--primary" disabled={!players.length} type="submit">Enregistrer les présences</button>
            </form> : <p className="academy-attendance-pending">La feuille sera disponible après la fin de la séance.</p>}
          </details>;
        })}
      </div>
    </section>
  </>;
}

function Schedule({ sessions }: { sessions: Awaited<ReturnType<typeof getGuardianDashboard>>["sessions"] }) {
  return <section className="academy-section"><div className="academy-section-heading"><div><CalendarDays size={22} /><h2>Planning des séances</h2></div><span>{sessions.length}</span></div>
    <div className="academy-schedule">{sessions.length ? sessions.map((session) => <article key={session.id}><time dateTime={session.startsAt}><strong>{dateTime(session.startsAt)}</strong><small><Clock3 size={14} /> jusqu’à {dateTime(session.endsAt)}</small></time><div><span>{session.category} · {session.groupName}</span><h3>{session.focus}</h3><p><MapPin size={15} /> {session.venue} · {session.coachName}</p></div></article>) : <p className="academy-empty">Aucun créneau programmé.</p>}</div>
  </section>;
}