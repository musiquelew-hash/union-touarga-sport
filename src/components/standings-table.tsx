import Image from "next/image";
import type { StandingSummary } from "@/lib/uts-data";
import { UTS_TEAM_ID } from "@/lib/uts-data";

export function StandingsTable({ rows, compact = false }: { rows: StandingSummary[]; compact?: boolean }) {
  return (
    <div className={`standings${compact ? " standings--compact" : ""}`}>
      <div className="standings__row standings__head">
        <span>#</span>
        <span>Club</span>
        <span>MJ</span>
        <span>G</span>
        <span>N</span>
        <span>P</span>
        <span>Diff</span>
        <span>Pts</span>
      </div>
      {rows.map((row) => (
        <div
          className={`standings__row${row.teamId === UTS_TEAM_ID ? " is-uts" : ""}`}
          key={row.teamId}
        >
          <strong className="standings__position">{row.position}</strong>
          <span className="standings__club">
            {row.imageUrl ? (
              <Image src={row.imageUrl} alt="" width={30} height={30} />
            ) : (
              <span className="standings__monogram" aria-hidden="true">
                {row.shortName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span>{row.shortName}</span>
          </span>
          <span>{row.played}</span>
          <span>{row.won}</span>
          <span>{row.drawn}</span>
          <span>{row.lost}</span>
          <span>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</span>
          <strong>{row.points}</strong>
        </div>
      ))}
    </div>
  );
}