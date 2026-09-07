import type { Metadata } from "next";
import { ArrowRight, CalendarDays, Shield, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchCard } from "@/components/match-card";
import { PageHeading } from "@/components/page-heading";
import { PlayerCard } from "@/components/player-card";
import { StaffCard } from "@/components/staff-card";
import { StandingsTable } from "@/components/standings-table";
import { TeamSwitcher } from "@/components/team-switcher";
import { getCmsCategorySafe } from "@/lib/relational-cms-db";
import { getClubTeam, getTeamSportsData, listClubTeams } from "@/lib/sports-hub";
import type { PlayerSummary, StaffSummary } from "@/lib/uts-data";

const positions: PlayerSummary["position"][] = ["Gardien", "Défenseur", "Milieu", "Attaquant", "Joueur"];
const positionLabels: Record<PlayerSummary["position"], string> = { Gardien: "Gardiens", Défenseur: "Défenseurs", Milieu: "Milieux", Attaquant: "Attaquants", Joueur: "Autres joueurs" };
const departments: StaffSummary["department"][] = ["Technique", "Médical", "Direction", "Autre"];
const departmentLabels: Record<StaffSummary["department"], string> = { Technique: "Staff technique", Médical: "Staff médical", Direction: "Direction", Autre: "Autres membres" };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const team = await getClubTeam(slug);
  return team ? { title: team.name, description: team.description } : { title: "Équipe" };
}

export default async function TeamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [team, teams, sports, playerCollection, staffCollection] = await Promise.all([
    getClubTeam(slug),
    listClubTeams(),
    getTeamSportsData(slug),
    getCmsCategorySafe<PlayerSummary>("player"),
    getCmsCategorySafe<StaffSummary>("staff"),
  ]);
  if (!team || !sports) notFound();

  const players = playerCollection.records.map((record) => record.data).filter((player) => (player.teamId || 1) === team.id);
  const staff = staffCollection.records.map((record) => record.data).filter((member) => (member.teamId || 1) === team.id);
  const playerGroups = positions.map((position) => ({ position, players: players.filter((player) => player.position === position) })).filter((group) => group.players.length);
  const staffGroups = departments.map((department) => ({ department, members: staff.filter((member) => member.department === department) })).filter((group) => group.members.length);
  const nextMatch = sports.upcomingMatches[0];
  const lastMatch = sports.recentMatches[0];

  return (
    <>
      <PageHeading eyebrow={team.categoryLabel} title={team.name} intro={team.description} image={team.heroImageUrl} imageAlt={team.name} imagePosition="bottom" />
      <div className="shell"><TeamSwitcher teams={teams} activeSlug={team.slug} route="/equipes" /></div>

      <section className="team-dashboard-band">
        <div className="shell">
          <div className="team-dashboard-band__heading"><div><span className="eyebrow eyebrow--yellow">Centre de l’équipe</span><h2>L’actualité du terrain</h2></div><span className={`sports-freshness sports-freshness--${sports.freshness}`}>{sports.freshness === "live" ? "Données synchronisées" : sports.freshness === "manual" ? "Piloté par le club" : "Données enregistrées"}</span></div>
          <div className="team-dashboard-band__grid">
            {nextMatch ? <MatchCard match={nextMatch} label="Prochain match" featured /> : <div className="sports-empty-tile"><CalendarDays size={28} /><strong>Prochain match</strong><span>Programmation à venir</span></div>}
            {lastMatch ? <MatchCard match={lastMatch} label="Dernier résultat" /> : <div className="sports-empty-tile"><Trophy size={28} /><strong>Dernier résultat</strong><span>Aucun résultat publié</span></div>}
          </div>
          <div className="team-dashboard-band__actions"><Link className="button button--yellow" href={`/matchs?equipe=${team.slug}`}>Tous les matchs <ArrowRight size={17} /></Link><Link className="button button--outline" href={`/classement?equipe=${team.slug}`}>Voir le classement <ArrowRight size={17} /></Link></div>
        </div>
      </section>

      <section className="content-band content-band--white">
        <div className="shell">
          <div className="section-heading"><div><span className="eyebrow">L’effectif</span><h2>Les visages de {team.shortName}</h2></div><p>{players.length} joueur{players.length === 1 ? "" : "s"} publié{players.length === 1 ? "" : "s"}</p></div>
          {playerGroups.length ? playerGroups.map((group) => <section className="squad-group" key={group.position}><div className="squad-group__heading"><h2>{positionLabels[group.position]}</h2><span>{group.players.length}</span></div><div className="players-grid">{group.players.map((player) => <PlayerCard detailed key={player.id} player={player} fallbackImageUrl="/uts/crest-color.png" />)}</div></section>) : <div className="empty-state"><Users size={32} /><h2>Effectif en préparation</h2><p>Les profils seront publiés depuis le dashboard du club.</p></div>}
        </div>
      </section>

      <section className="content-band">
        <div className="shell team-standing-preview">
          <div><span className="eyebrow">{sports.season}</span><h2>La course au classement</h2><p>Le classement correspondant à cette équipe et à sa compétition active.</p><Link className="button button--dark" href={`/classement?equipe=${team.slug}`}>Classement complet <ArrowRight size={17} /></Link></div>
          {sports.standings.length ? <StandingsTable rows={sports.standings.slice(0, 8)} compact highlightedTeamName="Union Touarga" /> : <div className="empty-state"><Shield size={32} /><h2>Classement à venir</h2><p>Le tableau sera affiché après synchronisation ou saisie par le club.</p></div>}
        </div>
      </section>

      <section className="content-band content-band--white"><div className="shell"><div className="section-heading"><div><span className="eyebrow">Encadrement</span><h2>Le staff</h2></div></div>{staffGroups.length ? staffGroups.map((group) => <section className="squad-group" key={group.department}><div className="squad-group__heading"><h2>{departmentLabels[group.department]}</h2><span>{group.members.length}</span></div><div className="staff-grid">{group.members.map((member) => <StaffCard key={member.id} member={member} fallbackImageUrl="/uts/crest-color.png" />)}</div></section>) : <div className="empty-state"><Users size={32} /><h2>Staff en préparation</h2><p>L’encadrement sera affiché après sa publication.</p></div>}</div></section>
    </>
  );
}
