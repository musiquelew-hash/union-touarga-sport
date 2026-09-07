import type { Metadata } from "next";
import { ArrowRight, Shield, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { getSiteContent } from "@/lib/site-content";
import { listClubTeams } from "@/lib/sports-hub";

export const metadata: Metadata = {
  title: "Les équipes",
  description: "Équipes masculine, féminine et formation de l’Union Touarga Sport.",
};

export default async function TeamsPage() {
  const [teams, content] = await Promise.all([listClubTeams(), getSiteContent()]);
  return (
    <>
      <PageHeading
        eyebrow="Un seul club · Toutes nos équipes"
        title="Les équipes UTS"
        intro="De l’équipe première au football féminin et à la formation, Touarga avance sous les mêmes couleurs."
        image={content.teamHeaderImageUrl}
        imageAlt={content.teamHeaderImageAlt}
        imagePosition="bottom"
      />
      <section className="content-band teams-universe">
        <div className="shell">
          <div className="teams-universe__grid">
            {teams.map((team, index) => (
              <Link className={`team-universe-card${index === 0 ? " team-universe-card--lead" : ""}`} href={`/equipes/${team.slug}`} key={team.id}>
                <Image src={team.heroImageUrl} alt="" fill sizes={index === 0 ? "(max-width: 800px) 100vw, 65vw" : "(max-width: 800px) 100vw, 35vw"} />
                <span className="team-universe-card__index">0{index + 1}</span>
                <div><span>{team.categoryLabel}</span><h2>{team.name}</h2><p>{team.description}</p><strong>Découvrir l’équipe <ArrowRight size={17} /></strong></div>
              </Link>
            ))}
          </div>
          {!teams.length && <div className="empty-state"><Users size={32} /><h2>Équipes en préparation</h2><p>Les univers sportifs apparaîtront après leur publication depuis le dashboard.</p></div>}
          <div className="teams-universe__statement"><Shield size={25} /><strong>Union Touarga Sport</strong><span>Masculins · Féminines · Formation</span></div>
        </div>
      </section>
    </>
  );
}
