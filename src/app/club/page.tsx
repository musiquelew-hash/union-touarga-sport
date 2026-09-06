import type { Metadata } from "next";
import { Flame, GraduationCap, Users } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { getUtsData } from "@/lib/uts-data";

export const metadata: Metadata = {
  title: "Le club",
  description: "Histoire, identité et valeurs de l'Union Touarga Sport depuis 1969.",
};

const milestones = [
  {
    year: "1969",
    title: "Naissance de l'Union",
    copy: "L'Union Touarga Sport est fondée à Rabat et construit son identité au cœur du quartier de Touarga.",
  },
  {
    year: "2019/20",
    title: "Champion du National Amateur",
    copy: "L'UTS remporte le championnat amateur et ouvre un nouveau cycle de progression sportive.",
  },
  {
    year: "2020/21",
    title: "Accession en Botola Pro 2",
    copy: "Le club rejoint le football professionnel et poursuit son ascension dans les compétitions nationales.",
  },
  {
    year: "2021/22",
    title: "Retour parmi l'élite",
    copy: "Vice-champion de Botola Pro 2, l'UTS gagne sa place au plus haut niveau du football marocain.",
  },
];

export default async function ClubPage() {
  const data = await getUtsData();

  return (
    <>
      <PageHeading
        eyebrow="Rabat · Touarga"
        title="Le club"
        intro="Une histoire collective née dans un quartier, portée par la formation et tournée vers l'exigence du plus haut niveau."
        image="/uts/hero-candidate.jpg"
        imageAlt="La grande famille de l’Union Touarga Sport réunie à Rabat"
        imagePosition="bottom"
      />

      <section className="section section--dark">
        <div className="shell club-intro">
          <div className="club-intro__number">
            1969
            <span>Année de fondation</span>
          </div>
          <div className="club-intro__copy">
            <h2>Un même maillot pour tout Touarga</h2>
            <p>
              L’UTS s’est construite autour d’une idée simple : rassembler les forces sportives du quartier
              pour porter une ambition commune. Cette culture de l’union reste au centre du projet du club.
            </p>
            <p>
              De la formation aux compétitions nationales, chaque étape traduit le même engagement envers
              les jeunes talents, le travail collectif et le lien avec Rabat.
            </p>
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
            {milestones.map((milestone) => (
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
          <h2>Stade Al Medina</h2>
          <p>
            Le Stade Al Medina accompagne l’identité de l’UTS à Rabat. Pour chaque rencontre, le lieu confirmé
            reste celui publié dans le calendrier, afin de tenir compte des éventuels changements d’enceinte.
          </p>
          <p>Ville du club : {data.team.city}. Entraîneur : {data.team.manager}.</p>
        </div>
      </section>
    </>
  );
}