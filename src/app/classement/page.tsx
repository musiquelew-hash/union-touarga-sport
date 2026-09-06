import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { DataStatus } from "@/components/data-status";
import { PageHeading } from "@/components/page-heading";
import { StandingsTable } from "@/components/standings-table";
import { getUtsData, UTS_TEAM_ID } from "@/lib/uts-data";

export const metadata: Metadata = {
  title: "Classement",
  description: "Classement actualisé de l'Union Touarga Sport en Botola Pro.",
};

export default async function StandingsPage() {
  const data = await getUtsData();
  const utsRow = data.standings.find((row) => row.teamId === UTS_TEAM_ID);
  const seasonHasStarted = data.standings.some((row) => row.played > 0);

  return (
    <>
      <PageHeading
        eyebrow="Botola Pro"
        title="Classement"
        intro="Le tableau complet du championnat, avec la position de l'UTS mise en avant et des données actualisées automatiquement."
        aside={<DataStatus data={data} inverse />}
        image="/uts/match-03.jpg"
        imageAlt="Remise d’un trophée à l’Union Touarga Sport"
        imagePosition="center"
      />

      <section className="content-band">
        <div className="shell">
          <div className="content-band__heading">
            <h2>{data.standingsSeason}</h2>
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