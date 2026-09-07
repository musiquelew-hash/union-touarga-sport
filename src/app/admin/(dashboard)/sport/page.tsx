import { CalendarSync, Plus, Save, Shield, TableProperties, Trash2, UsersRound } from "lucide-react";
import Link from "next/link";
import {
  deleteSportsRecordAction,
  saveSportsMatchAction,
  saveSportsStandingAction,
  saveSportsTeamAction,
  syncSportsTeamAction,
} from "@/app/admin/actions";
import { AdminImageField } from "@/components/admin/admin-image-field";
import { AdminNotice } from "@/components/admin/admin-notice";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getSportsAdminData,
  sportsProviders,
  type ClubTeam,
  type SportsMatch,
  type SportsStanding,
} from "@/lib/sports-hub";

const providerLabels = {
  manual: "Dashboard uniquement",
  sofascore: "SofaScore",
  thesportsdb: "TheSportsDB",
};

const statusLabels = {
  scheduled: "Programmé",
  live: "En direct",
  finished: "Terminé",
  postponed: "Reporté",
  cancelled: "Annulé",
};

function dateTimeValue(timestamp?: number) {
  return timestamp ? new Date(timestamp * 1000).toISOString().slice(0, 16) : new Date(Date.now() + 86400000).toISOString().slice(0, 16);
}

function TeamForm({ team }: { team?: ClubTeam }) {
  return (
    <form action={saveSportsTeamAction} className="admin-record-form">
      {team && <input name="id" type="hidden" value={team.id} />}
      <div className="admin-form-grid">
        <label><span>Identifiant URL</span><input name="slug" defaultValue={team?.slug || ""} placeholder="feminine" pattern="[a-z0-9-]+" required /></label>
        <label><span>Nom public</span><input name="name" defaultValue={team?.name || ""} placeholder="Équipe féminine" required /></label>
        <label><span>Nom court</span><input name="shortName" defaultValue={team?.shortName || ""} placeholder="Féminines" required /></label>
        <label><span>Catégorie affichée</span><input name="categoryLabel" defaultValue={team?.categoryLabel || ""} placeholder="Équipe féminine" required /></label>
        <label><span>Type d’équipe</span><select name="type" defaultValue={team?.type || "youth"}><option value="men">Masculine</option><option value="women">Féminine</option><option value="youth">Formation</option></select></label>
        <label><span>Source sportive</span><select name="apiProvider" defaultValue={team?.apiProvider || "manual"}>{sportsProviders.map((provider) => <option key={provider} value={provider}>{providerLabels[provider]}</option>)}</select></label>
        <label><span>ID équipe API</span><input name="apiTeamId" defaultValue={team?.apiTeamId || ""} placeholder="Ex. 118834" /></label>
        <label><span>ID tournoi API</span><input name="apiTournamentId" defaultValue={team?.apiTournamentId || ""} placeholder="Ex. 937" /></label>
        <label><span>ID championnat API</span><input name="apiLeagueId" defaultValue={team?.apiLeagueId || ""} /></label>
        <label><span>Ordre d’affichage</span><input name="sortOrder" type="number" defaultValue={team?.sortOrder || 0} /></label>
        <label className="admin-field--wide"><span>Présentation</span><textarea name="description" defaultValue={team?.description || ""} rows={3} required /></label>
        <AdminImageField label="Photo principale de l’équipe" name="heroImageUrl" value={team?.heroImageUrl || "/uts/team.jpg"} />
        <label className="admin-checkbox"><input name="published" type="checkbox" defaultChecked={team?.published ?? true} /><span>Visible sur le site</span></label>
        <label className="admin-checkbox"><input name="primary" type="checkbox" defaultChecked={team?.primary ?? false} /><span>Équipe principale</span></label>
      </div>
      <div className="admin-record-actions"><AdminSubmitButton className="admin-button admin-button--primary"><Save size={16} /> {team ? "Enregistrer l’équipe" : "Créer l’équipe"}</AdminSubmitButton></div>
    </form>
  );
}

function MatchForm({ team, match }: { team: ClubTeam; match?: SportsMatch }) {
  return (
    <form action={saveSportsMatchAction} className="admin-record-form">
      <input name="teamId" type="hidden" value={team.id} />
      {match && <input name="recordKey" type="hidden" value={match.key} />}
      <div className="admin-form-grid">
        <label><span>Date et heure (UTC)</span><input name="startsAt" type="datetime-local" defaultValue={dateTimeValue(match?.timestamp)} required /></label>
        <label><span>État</span><select name="status" defaultValue={match?.status || "scheduled"}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Compétition</span><input name="competition" defaultValue={match?.competition || "Championnat"} required /></label>
        <label><span>Saison</span><input name="season" defaultValue={match?.season || "2026/2027"} required /></label>
        <label><span>Journée / tour</span><input name="roundLabel" defaultValue={match?.roundLabel || ""} /></label>
        <label><span>Stade</span><input name="venue" defaultValue={match?.venue || ""} /></label>
        <label><span>Équipe à domicile</span><input name="homeName" defaultValue={match?.home.name || "Union Touarga Sport"} required /></label>
        <label><span>Nom court domicile</span><input name="homeShortName" defaultValue={match?.home.shortName || "UTS"} required /></label>
        <label><span>Code domicile</span><input name="homeCode" defaultValue={match?.home.code || "UTS"} maxLength={12} required /></label>
        <AdminImageField label="Écusson domicile" name="homeBadgeUrl" value={match?.home.imageUrl || "/uts/crest-color.png"} />
        <label><span>Équipe à l’extérieur</span><input name="awayName" defaultValue={match?.away.name || ""} required /></label>
        <label><span>Nom court extérieur</span><input name="awayShortName" defaultValue={match?.away.shortName || ""} required /></label>
        <label><span>Code extérieur</span><input name="awayCode" defaultValue={match?.away.code || ""} maxLength={12} required /></label>
        <AdminImageField label="Écusson extérieur" name="awayBadgeUrl" value={match?.away.imageUrl || ""} />
        <label><span>Score domicile</span><input name="homeScore" type="number" min={0} defaultValue={match?.homeScore ?? ""} /></label>
        <label><span>Score extérieur</span><input name="awayScore" type="number" min={0} defaultValue={match?.awayScore ?? ""} /></label>
        <label className="admin-field--wide"><span>Lien du compte rendu</span><input name="reportUrl" type="url" defaultValue={match?.reportUrl || ""} /></label>
        <label className="admin-checkbox"><input name="published" type="checkbox" defaultChecked={match?.published ?? true} /><span>Publié</span></label>
        <label className="admin-checkbox"><input name="featured" type="checkbox" defaultChecked={match?.featured ?? false} /><span>Mettre à la une</span></label>
      </div>
      <div className="admin-record-actions"><AdminSubmitButton className="admin-button admin-button--primary"><Save size={16} /> {match ? "Enregistrer le match" : "Ajouter le match"}</AdminSubmitButton></div>
    </form>
  );
}

function StandingForm({ team, row, nextPosition = 1 }: { team: ClubTeam; row?: SportsStanding; nextPosition?: number }) {
  return (
    <form action={saveSportsStandingAction} className="admin-record-form">
      <input name="teamId" type="hidden" value={team.id} />
      {row && <input name="recordKey" type="hidden" value={row.key} />}
      <div className="admin-form-grid">
        <label><span>Saison</span><input name="season" defaultValue={row?.season || "2026/2027"} required /></label>
        <label><span>Position</span><input name="position" type="number" min={1} defaultValue={row?.position || nextPosition} required /></label>
        <label><span>Club</span><input name="clubName" defaultValue={row?.team || ""} required /></label>
        <label><span>Nom court</span><input name="clubShortName" defaultValue={row?.shortName || ""} required /></label>
        <AdminImageField label="Écusson" name="clubBadgeUrl" value={row?.imageUrl || ""} />
        <label><span>MJ</span><input name="played" type="number" min={0} defaultValue={row?.played || 0} /></label>
        <label><span>G</span><input name="won" type="number" min={0} defaultValue={row?.won || 0} /></label>
        <label><span>N</span><input name="drawn" type="number" min={0} defaultValue={row?.drawn || 0} /></label>
        <label><span>P</span><input name="lost" type="number" min={0} defaultValue={row?.lost || 0} /></label>
        <label><span>Buts pour</span><input name="goalsFor" type="number" min={0} defaultValue={row?.goalsFor || 0} /></label>
        <label><span>Buts contre</span><input name="goalsAgainst" type="number" min={0} defaultValue={row?.goalsAgainst || 0} /></label>
        <label><span>Points</span><input name="points" type="number" defaultValue={row?.points || 0} /></label>
        <label><span>Zone</span><input name="zone" defaultValue={row?.zone || ""} placeholder="Qualification, relégation…" /></label>
        <label className="admin-checkbox"><input name="published" type="checkbox" defaultChecked={row?.published ?? true} /><span>Publié</span></label>
      </div>
      <div className="admin-record-actions"><AdminSubmitButton className="admin-button admin-button--primary"><Save size={16} /> {row ? "Enregistrer la ligne" : "Ajouter au classement"}</AdminSubmitButton></div>
    </form>
  );
}

export default async function SportsAdminPage({ searchParams }: { searchParams: Promise<{ team?: string; saved?: string; error?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const requestedTeam = params.team ? Number(params.team) : undefined;
  const { teams, activeTeam, matches, standings } = await getSportsAdminData(requestedTeam);

  return (
    <div className="admin-page sports-admin-page">
      <header className="admin-page-heading">
        <div><p className="admin-kicker">Toutes les catégories</p><h1>Centre sportif</h1><p>Configurez les équipes, synchronisez les données publiques et corrigez chaque match ou classement depuis le dashboard.</p></div>
        {activeTeam?.apiProvider !== "manual" && <form action={syncSportsTeamAction}><input name="teamId" type="hidden" value={activeTeam?.id} /><AdminSubmitButton className="admin-button admin-button--primary" pendingLabel="Synchronisation…"><CalendarSync size={17} /> Synchroniser l’API</AdminSubmitButton></form>}
      </header>
      <AdminNotice saved={params.saved} error={params.error} />

      <nav className="sports-team-switcher" aria-label="Équipes administrées">
        {teams.map((team) => <Link className={team.id === activeTeam?.id ? "is-active" : ""} href={`/admin/sport?team=${team.id}`} key={team.id}><span>{team.categoryLabel}</span><strong>{team.shortName}</strong></Link>)}
      </nav>

      {activeTeam && <>
        <section className="admin-panel">
          <div className="admin-panel__heading"><div><span><UsersRound size={17} /></span><h2>Identité de {activeTeam.shortName}</h2></div><p>Source actuelle : {providerLabels[activeTeam.apiProvider]}</p></div>
          <TeamForm team={activeTeam} />
        </section>

        <section className="admin-record-list">
          <div className="admin-list-heading"><h2>Matchs et résultats</h2><span>{matches.length}</span></div>
          <details className="admin-record admin-record--new"><summary><Plus size={18} /><span><strong>Ajouter un match</strong><small>Saisie manuelle prioritaire sur l’API</small></span></summary><div className="admin-record__body"><MatchForm team={activeTeam} /></div></details>
          {matches.map((match) => <details className="admin-record" key={match.key}><summary><span className={`admin-publish-dot${match.published ? " is-published" : ""}`} /><span><strong>{match.home.shortName} · {match.homeScore ?? "–"} — {match.awayScore ?? "–"} · {match.away.shortName}</strong><small>{new Date(match.timestamp * 1000).toLocaleString("fr-FR")} · {match.competition} · {match.manualLock ? "Verrouillé dashboard" : match.sourceName}</small></span><span className="admin-record__status">{statusLabels[match.status]}</span></summary><div className="admin-record__body"><MatchForm team={activeTeam} match={match} /><form action={deleteSportsRecordAction} className="admin-delete-form"><input name="teamId" type="hidden" value={activeTeam.id} /><input name="kind" type="hidden" value="match" /><input name="recordKey" type="hidden" value={match.key} /><AdminSubmitButton className="admin-button admin-button--danger" confirmMessage="Supprimer ce match ?"><Trash2 size={16} /> Supprimer</AdminSubmitButton></form></div></details>)}
        </section>

        <section className="admin-record-list">
          <div className="admin-list-heading"><h2>Classement</h2><span>{standings.length}</span></div>
          <details className="admin-record admin-record--new"><summary><Plus size={18} /><span><strong>Ajouter une ligne</strong><small>Pour les compétitions non couvertes par une API</small></span></summary><div className="admin-record__body"><StandingForm team={activeTeam} nextPosition={standings.length + 1} /></div></details>
          {standings.map((row) => <details className="admin-record" key={row.key}><summary><strong className="sports-standing-position">{row.position}</strong><span><strong>{row.team}</strong><small>{row.played} MJ · {row.points} pts · {row.manualLock ? "Verrouillé dashboard" : row.sourceName}</small></span><span className="admin-record__status">{row.season}</span></summary><div className="admin-record__body"><StandingForm team={activeTeam} row={row} /><form action={deleteSportsRecordAction} className="admin-delete-form"><input name="teamId" type="hidden" value={activeTeam.id} /><input name="kind" type="hidden" value="standing" /><input name="recordKey" type="hidden" value={row.key} /><AdminSubmitButton className="admin-button admin-button--danger" confirmMessage="Supprimer cette ligne ?"><Trash2 size={16} /> Supprimer</AdminSubmitButton></form></div></details>)}
        </section>
      </>}

      <details className="admin-panel admin-new-record">
        <summary className="admin-panel__heading"><div><span><Shield size={17} /></span><h2>Créer une catégorie</h2></div><p>Ajoutez une nouvelle équipe sans intervention technique.</p></summary>
        <TeamForm />
      </details>

      <section className="admin-panel sports-admin-help"><TableProperties size={22} /><div><h2>Priorité des données</h2><p>Une correction enregistrée ici est verrouillée et ne sera jamais écrasée par une synchronisation. Les autres lignes continueront de se mettre à jour depuis le fournisseur configuré.</p></div></section>
    </div>
  );
}
