import type { Metadata } from "next";
import { CalendarClock, Trophy } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { PageHeading } from "@/components/page-heading";
import { TeamSwitcher } from "@/components/team-switcher";
import { getSiteContent } from "@/lib/site-content";
import { getTeamSportsData, listClubTeams } from "@/lib/sports-hub";

export const metadata: Metadata = {
  title: "Matchs et résultats",
  description: "Calendrier et derniers résultats de l'Union Touarga Sport.",
};

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ equipe?: string }> }) {
  const [params, teams, content] = await Promise.all([searchParams, listClubTeams(), getSiteContent()]);
  const activeSlug = teams.some((team) => team.slug === params.equipe) ? params.equipe! : teams.find((team) => team.primary)?.slug || teams[0]?.slug || "masculine";
  const data = await getTeamSportsData(activeSlug);
  if (!data) return null;

  return (
    <>
      <PageHeading
        eyebrow={data.team.categoryLabel}
        title="Matchs & résultats"
        intro={`Le calendrier de ${data.team.shortName}, alimenté par l’API sportive ou directement par le club.`}
        image={content.matchesHeaderImageUrl}
        imageAlt={content.matchesHeaderImageAlt}
        imagePosition="center"
      />

      <div className="shell"><TeamSwitcher teams={teams} activeSlug={activeSlug} route="/matchs" query /></div>

      <section className="content-band">
        <div className="shell">
          <div className="content-band__heading">
            <h2>À venir</h2>
            <p>{data.upcomingMatches.length} rencontre{data.upcomingMatches.length > 1 ? "s" : ""} programmée{data.upcomingMatches.length > 1 ? "s" : ""} · {data.season}</p>
          </div>
          {data.upcomingMatches.length > 0 ? (
            <div className="home-scoreboard">
              {data.upcomingMatches.map((match, index) => (
                <MatchCard key={match.id} match={match} label="À venir" featured={index === 0} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <CalendarClock aria-hidden="true" size={32} />
              <h2>Calendrier en attente</h2>
              <p>Les prochaines rencontres apparaîtront ici dès leur programmation.</p>
            </div>
          )}
        </div>
      </section>

      <section className="content-band content-band--white">
        <div className="shell">
          <div className="content-band__heading">
            <h2>Derniers résultats</h2>
            <p>Les rencontres les plus récentes en premier</p>
          </div>
          {data.recentMatches.length > 0 ? (
            <div className="home-scoreboard">
              {data.recentMatches.map((match) => (
                <MatchCard key={match.id} match={match} label="Terminé" />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Trophy aria-hidden="true" size={32} />
              <h2>Résultats en attente</h2>
              <p>Les scores reviendront automatiquement à la prochaine synchronisation.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}