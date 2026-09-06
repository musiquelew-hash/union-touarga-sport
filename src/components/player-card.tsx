import Image from "next/image";
import type { PlayerSummary } from "@/lib/uts-data";

export function PlayerCard({
  player,
  fallbackImageUrl,
  detailed = false,
}: {
  player: PlayerSummary;
  fallbackImageUrl: string;
  detailed?: boolean;
}) {
  const hasStatistics = [player.appearances, player.goals, player.assists].some((value) => value !== null);

  return (
    <article className={`player-card${detailed ? " player-card--detailed" : ""}`}>
      <div className="player-card__image">
        <span className="player-card__number">{player.number || "–"}</span>
        <Image
          src={player.imageUrl || fallbackImageUrl}
          alt={`Portrait de ${player.name}`}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
        />
      </div>
      <div className="player-card__body">
        <span>{player.position}</span>
        <h3>{player.shortName}</h3>
        <div className="player-card__facts">
          <span>{player.age ? `${player.age} ans` : "Âge n.c."}</span>
          <span>{player.nationality}</span>
        </div>
        {detailed && (
          <>
            <dl className="player-card__details">
              <div>
                <dt>Taille</dt>
                <dd>{player.height ? `${player.height} cm` : "N.C."}</dd>
              </div>
              <div>
                <dt>Pied fort</dt>
                <dd>{player.foot || "N.C."}</dd>
              </div>
            </dl>
            {hasStatistics && (
              <div className="player-card__stats" aria-label="Statistiques de la saison">
                <span><strong>{player.appearances ?? 0}</strong> Matchs</span>
                <span><strong>{player.goals ?? 0}</strong> Buts</span>
                <span><strong>{player.assists ?? 0}</strong> Passes</span>
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}