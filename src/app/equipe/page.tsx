import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { PlayerCard } from "@/components/player-card";
import { StaffCard } from "@/components/staff-card";
import { getUtsData, type PlayerSummary, type StaffSummary } from "@/lib/uts-data";

export const metadata: Metadata = {
  title: "Équipe première",
  description: "Effectif, postes et profils des joueurs de l'Union Touarga Sport.",
};

const positions: PlayerSummary["position"][] = ["Gardien", "Défenseur", "Milieu", "Attaquant", "Joueur"];
const positionLabels: Record<PlayerSummary["position"], string> = {
  Gardien: "Gardiens",
  Défenseur: "Défenseurs",
  Milieu: "Milieux",
  Attaquant: "Attaquants",
  Joueur: "Autres joueurs",
};

const departments: StaffSummary["department"][] = ["Technique", "Médical", "Direction", "Autre"];
const departmentLabels: Record<StaffSummary["department"], string> = {
  Technique: "Staff technique",
  Médical: "Staff médical",
  Direction: "Direction",
  Autre: "Autres membres",
};

export default async function TeamPage() {
  const data = await getUtsData();
  const groups = positions
    .map((position) => ({ position, players: data.players.filter((player) => player.position === position) }))
    .filter((group) => group.players.length > 0);
  const staffGroups = departments
    .map((department) => ({ department, members: data.staff.filter((member) => member.department === department) }))
    .filter((group) => group.members.length > 0);

  return (
    <>
      <PageHeading
        eyebrow="Équipe première"
        title="L'effectif"
        intro="Les joueurs et les membres de l’encadrement publiés par le club, regroupés par ligne et par département."
        image="/uts/hero-candidate.jpg"
        imageAlt="L’ensemble des équipes et du staff de l’Union Touarga Sport"
        imagePosition="bottom"
      />

      <section className="content-band">
        <div className="shell">
          <div className="squad-summary" aria-label="Résumé de l'effectif">
            <div className="squad-summary__item">
              <strong>{data.players.length || "–"}</strong>
              <small>Joueurs</small>
            </div>
            <div className="squad-summary__item">
              <strong>{data.staff.length || "–"}</strong>
              <small>Membres du staff</small>
            </div>
            <div className="squad-summary__item">
              <strong>{groups.length || "–"}</strong>
              <small>Lignes de jeu</small>
            </div>
          </div>

          {groups.length > 0 ? (
            <div className="content-band">
              {groups.map((group) => (
                <section className="squad-group" key={group.position}>
                  <div className="squad-group__heading">
                    <h2>{positionLabels[group.position]}</h2>
                    <span>{group.players.length} joueur{group.players.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="players-grid">
                    {group.players.map((player) => (
                      <PlayerCard key={player.id} player={player} detailed />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Users aria-hidden="true" size={32} />
              <h2>Aucun joueur publié</h2>
              <p>L’effectif sera affiché après sa publication depuis le dashboard.</p>
            </div>
          )}

          {staffGroups.length > 0 ? (
            <div className="staff-section">
              {staffGroups.map((group) => (
                <section className="squad-group" key={group.department}>
                  <div className="squad-group__heading">
                    <h2>{departmentLabels[group.department]}</h2>
                    <span>{group.members.length} membre{group.members.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="staff-grid">
                    {group.members.map((member) => (
                      <StaffCard key={member.id} member={member} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="empty-state staff-section">
              <Users aria-hidden="true" size={32} />
              <h2>Aucun membre du staff publié</h2>
              <p>L’encadrement sera affiché après sa publication depuis le dashboard.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}