import type { Metadata } from "next";
import { Flame, GraduationCap, Users } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { getSiteContent } from "@/lib/site-content";
import { getUtsData } from "@/lib/uts-data";

export const metadata: Metadata = {
  title: "Le club",
  description: "Histoire, identité et valeurs de l'Union Touarga Sport depuis 1969.",
};

export default async function ClubPage() {
  const [data, content] = await Promise.all([getUtsData(), getSiteContent()]);

  return (
    <>
      <PageHeading
        eyebrow="Rabat · Touarga"
        title="Le club"
        intro="Une histoire collective née dans un quartier, portée par la formation et tournée vers l'exigence du plus haut niveau."
        image={content.clubHeaderImageUrl}
        imageAlt={content.clubHeaderImageAlt}
        imagePosition="bottom"
      />

      <section className="section section--dark">
        <div className="shell club-intro">
          <div className="club-intro__number">
            1969
            <span>Année de fondation</span>
          </div>
          <div className="club-intro__copy">
            <h2>{content.clubIntroTitle}</h2>
            <p>{content.clubIntroParagraphOne}</p>
            <p>{content.clubIntroParagraphTwo}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Fiers de nos valeurs</span>
              <h2>Ce qui guide l’UTS</h2>
            </div>
            <p>Trois principes qui structurent le projet sportif, la formation et la vie du club.</p>
          </div>
          <div className="values-grid">
            <article className="value-block">
              <Users aria-hidden="true" size={34} />
              <strong>Unité</strong>
              <p>Faire équipe, partager les responsabilités et avancer sous les mêmes couleurs.</p>
            </article>
            <article className="value-block">
              <Flame aria-hidden="true" size={34} />
              <strong>Ténacité</strong>
              <p>Travailler avec constance et répondre aux défis avec caractère, sur le terrain comme en dehors.</p>
            </article>
            <article className="value-block">
              <GraduationCap aria-hidden="true" size={34} />
              <strong>Formation</strong>
              <p>Faire grandir les talents et transmettre les exigences humaines autant que sportives.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Repères</span>
              <h2>Une ascension construite</h2>
            </div>
            <p>Des racines de Touarga au retour dans l’élite du football marocain.</p>
          </div>
          <div className="timeline">
            {content.clubMilestones.map((milestone) => (
              <article className="timeline__item" key={milestone.year}>
                <strong className="timeline__year">{milestone.year}</strong>
                <div>
                  <h3>{milestone.title}</h3>
                  <p>{milestone.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="club-story-band">
        <div className="club-story-band__year club-story-band__year--place">Rabat</div>
        <div className="club-story-band__copy">
          <span className="eyebrow eyebrow--yellow">Notre terrain</span>
          <h2>{content.clubVenueTitle}</h2>
          <p>{content.clubVenueCopy}</p>
          <p>Ville du club : {data.team.city}. Entraîneur : {data.team.manager}.</p>
        </div>
      </section>
    </>
  );
}