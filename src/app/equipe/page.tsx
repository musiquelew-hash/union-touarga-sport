import type { Metadata } from "next";
import { Users } from "lucide-react";
import { DataStatus } from "@/components/data-status";
import { PageHeading } from "@/components/page-heading";
import { PlayerCard } from "@/components/player-card";
import { getUtsData, type PlayerSummary } from "@/lib/uts-data";

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

export default async function TeamPage() {
  const data = await getUtsData();
  const playersWithAge = data.players.filter((player) => player.age !== null);
  const averageAge = playersWithAge.length
    ? Math.round(playersWithAge.reduce((total, player) => total + (player.age || 0), 0) / playersWithAge.length)
    : null;
  const groups = positions
    .map((position) => ({ position, players: data.players.filter((player) => player.position === position) }))
    .filter((group) => group.players.length > 0);

  return (
    <>
      <PageHeading
        eyebrow="Équipe première"
        title="L'effectif"
        intro="Les joueurs enregistrés avec l'UTS, classés par ligne. Les statistiques de saison apparaissent dès leur publication par la source sportive."
        aside={<DataStatus data={data} inverse />}
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
              <strong>{averageAge ? `${averageAge} ans` : "–"}</strong>
              <small>Âge moyen</small>
            </div>
            <div className="squad-summary__item">
              <strong>{data.players.filter((player) => player.number).length || "–"}</strong>
              <small>Numéros confirmés</small>
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
              <h2>Effectif en cours de synchronisation</h2>
              <p>Les profils des joueurs réapparaîtront automatiquement dès que la source sera disponible.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}