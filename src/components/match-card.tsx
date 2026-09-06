import { CalendarDays, MapPin } from "lucide-react";
import Image from "next/image";
import type { MatchSummary, TeamSummarySmall } from "@/lib/uts-data";
import { formatDate, formatShortDate, formatTime } from "@/lib/format";

function Team({ team }: { team: TeamSummarySmall }) {
  return (
    <div className="match-team">
      <span className="match-team__logo">
        {team.imageUrl ? (
          <Image src={team.imageUrl} alt={`Écusson ${team.name}`} width={72} height={72} />
        ) : (
          <span className="match-team__monogram" aria-hidden="true">{team.code}</span>
        )}
      </span>
      <span>
        <strong>{team.shortName}</strong>
        <small>{team.code}</small>
      </span>
    </div>
  );
}

export function MatchCard({
  match,
  label,
  featured = false,
}: {
  match: MatchSummary;
  label: string;
  featured?: boolean;
}) {
  const hasScore = match.homeScore !== null && match.awayScore !== null;

  return (
    <article className={`match-card${featured ? " match-card--featured" : ""}`}>
      <div className="match-card__header">
        <span className="eyebrow">{label}</span>
        <span>{match.competition} · {match.season}</span>
      </div>
      <div className="match-card__teams">
        <Team team={match.home} />
        <div className="match-card__score" aria-label={hasScore ? `Score ${match.homeScore} à ${match.awayScore}` : "Match à venir"}>
          {hasScore ? (
            <strong>{match.homeScore}<i>:</i>{match.awayScore}</strong>
          ) : (
            <>
              <strong>{formatTime(match.timestamp)}</strong>
              <small>{formatShortDate(match.timestamp)}</small>
            </>
          )}
        </div>
        <Team team={match.away} />
      </div>
      <div className="match-card__meta">
        <span><CalendarDays aria-hidden="true" size={15} />{formatDate(match.timestamp)}</span>
        <span><MapPin aria-hidden="true" size={15} />{match.venue || "Lieu à confirmer"}</span>
        {match.round && <span>Journée {match.round}</span>}
      </div>
    </article>
  );
}