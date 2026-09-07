import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { StandingsTable } from "@/components/standings-table";
import { TeamSwitcher } from "@/components/team-switcher";
import { getSiteContent } from "@/lib/site-content";
import { getTeamSportsData, listClubTeams } from "@/lib/sports-hub";

export const metadata: Metadata = {
  title: "Classement",
  description: "Classement actualisé de l'Union Touarga Sport en Botola Pro.",
};

export default async function StandingsPage({ searchParams }: { searchParams: Promise<{ equipe?: string }> }) {
  const [params, teams, content] = await Promise.all([searchParams, listClubTeams(), getSiteContent()]);
  const activeSlug = teams.some((team) => team.slug === params.equipe) ? params.equipe! : teams.find((team) => team.primary)?.slug || teams[0]?.slug || "masculine";
  const data = await getTeamSportsData(activeSlug);
  if (!data) return null;
  const utsRow = data.standings.find((row) => row.team.toLowerCase().includes("touarga"));
  const seasonHasStarted = data.standings.some((row) => row.played > 0);

  return (
    <>
      <PageHeading
        eyebrow={data.team.categoryLabel}
        title="Classement"
        intro={`Le tableau de ${data.team.shortName}, synchronisé par API ou tenu à jour directement par le club.`}
        image={content.standingsHeaderImageUrl}
        imageAlt={content.standingsHeaderImageAlt}
        imagePosition="center"
      />

      <div className="shell"><TeamSwitcher teams={teams} activeSlug={activeSlug} route="/classement" query /></div>

      <section className="content-band">
        <div className="shell">
          <div className="content-band__heading">
            <h2>{data.season}</h2>
            <p>
              {seasonHasStarted
                ? "Classement sportif en cours"
                : "Ordre initial avant les premières rencontres"}
            </p>
          </div>

          <div className="squad-summary" aria-label="Résumé du classement">
            <div className="squad-summary__item">
              <strong>{data.standings.length || "–"}</strong>
              <small>Clubs engagés</small>
            </div>
            <div className="squad-summary__item">
              <strong>{seasonHasStarted ? utsRow?.position || "–" : "À jouer"}</strong>
              <small>Position UTS</small>
            </div>
            <div className="squad-summary__item">
              <strong>{utsRow?.points ?? "–"}</strong>
              <small>Points</small>
            </div>
          </div>

          {data.standings.length > 0 ? (
            <>
              <div className="full-standings">
                <StandingsTable rows={data.standings} />
              </div>
              <div className="standings-legend">
                <span><i aria-hidden="true" /> Union Touarga Sport</span>
                {!seasonHasStarted && <span>Le rang affiché est provisoire tant qu’aucun match n’a été joué.</span>}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Shield aria-hidden="true" size={32} />
              <h2>Classement en attente</h2>
              <p>Le tableau réapparaîtra automatiquement dès que la source du championnat sera disponible.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}