import type { Metadata } from "next";
import { CalendarClock, Trophy } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { PageHeading } from "@/components/page-heading";
import { getSiteContent } from "@/lib/site-content";
import { getUtsData } from "@/lib/uts-data";

export const metadata: Metadata = {
  title: "Matchs et résultats",
  description: "Calendrier et derniers résultats de l'Union Touarga Sport.",
};

export default async function MatchesPage() {
  const [data, content] = await Promise.all([getUtsData(), getSiteContent()]);

  return (
    <>
      <PageHeading
        eyebrow="Saison en cours"
        title="Matchs & résultats"
        intro="Les prochaines affiches et les derniers scores de l'UTS, synchronisés automatiquement au rythme des compétitions."
        image={content.matchesHeaderImageUrl}
        imageAlt={content.matchesHeaderImageAlt}
        imagePosition="center"
      />

      <section className="content-band">
        <div className="shell">
          <div className="content-band__heading">
            <h2>À venir</h2>
            <p>{data.upcomingMatches.length} rencontre{data.upcomingMatches.length > 1 ? "s" : ""} programmée{data.upcomingMatches.length > 1 ? "s" : ""}</p>
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