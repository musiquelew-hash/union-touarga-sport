import type { Metadata } from "next";
import { ArrowUpRight, Camera, Play, Video } from "lucide-react";
import Image from "next/image";
import { DataStatus } from "@/components/data-status";
import { MediaCard } from "@/components/media-card";
import { NewsCard } from "@/components/news-card";
import { PageHeading } from "@/components/page-heading";
import { getUtsData } from "@/lib/uts-data";

export const metadata: Metadata = {
  title: "Actualités et médias",
  description: "Vidéos, actualités et réseaux officiels de l'Union Touarga Sport.",
};

export default async function MediaPage() {
  const data = await getUtsData();

  return (
    <>
      <PageHeading
        eyebrow="Touarga TV"
        title="Actualités & médias"
        intro="Les dernières images de l'UTS et les publications éditoriales du club, réunies dans un même espace."
        aside={<DataStatus data={data} inverse />}
        image="/uts/match-01.jpg"
        imageAlt="Les joueurs UTS célèbrent un titre au milieu des confettis"
        imagePosition="center"
      />

      <section className="content-band media-photo-band">
        <div className="shell">
          <div className="content-band__heading">
            <h2>Dernières images</h2>
            <p>Photographies officielles du club</p>
          </div>
          <div className="media-photo-grid">
            <figure className="media-photo-grid__item media-photo-grid__item--lead">
              <Image src="/uts/match-01.jpg" alt="Célébration du titre de l’équipe futsal UTS" fill sizes="(max-width: 820px) 100vw, 58vw" />
              <figcaption><span>Futsal</span><strong>Champions, dès la première année</strong></figcaption>
            </figure>
            <figure className="media-photo-grid__item">
              <Image src="/uts/team.jpg" alt="Équipe UTS avant une rencontre" fill sizes="(max-width: 820px) 100vw, 34vw" />
              <figcaption><span>Formation</span><strong>La relève en jaune et noir</strong></figcaption>
            </figure>
            <figure className="media-photo-grid__item">
              <Image src="/uts/match-02.jpg" alt="Photo collective des champions UTS" fill sizes="(max-width: 820px) 100vw, 34vw" />
              <figcaption><span>Club</span><strong>Une victoire collective</strong></figcaption>
            </figure>
            <figure className="media-photo-grid__item">
              <Image src="/uts/portrait.jpg" alt="Membre du staff UTS pendant une rencontre" fill sizes="(max-width: 820px) 100vw, 34vw" />
              <figcaption><span>Coulisses</span><strong>Au plus près du terrain</strong></figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="content-band content-band--white">
        <div className="shell">
          <div className="content-band__heading">
            <h2>Dernières vidéos</h2>
            <p>{data.media.length} publication{data.media.length > 1 ? "s" : ""}</p>
          </div>
          {data.media.length > 0 ? (
            <div className="media-grid">
              {data.media.map((media, index) => (
                <MediaCard key={media.id} media={media} featured={index === 0} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Video aria-hidden="true" size={32} />
              <h2>Vidéos en cours de synchronisation</h2>
              <p>Les dernières images du club réapparaîtront automatiquement.</p>
            </div>
          )}
        </div>
      </section>

      <section className="content-band content-band--white">
        <div className="shell">
          <div className="content-band__heading">
            <h2>Actualités officielles</h2>
            <a href="https://touargaclub.ma/nos-news/" target="_blank" rel="noreferrer">
              Voir la source <ArrowUpRight aria-hidden="true" size={16} />
            </a>
          </div>
          {data.news.length > 0 ? (
            <div className="news-grid media-news-grid">
              {data.news.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Video aria-hidden="true" size={32} />
              <h2>Actualités en cours de synchronisation</h2>
              <p>Les publications du club reviendront dès que le flux officiel sera disponible.</p>
            </div>
          )}
        </div>
      </section>

      <section className="section section--dark social-band">
        <Image src="/uts/story.jpg" alt="" fill sizes="100vw" />
        <div className="shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow eyebrow--yellow">Comptes vérifiés</span>
              <h2>Suivre l’UTS au quotidien</h2>
            </div>
            <p>Entraînements, coulisses et temps forts publiés directement par le club.</p>
          </div>
          <div className="home-hero__actions">
            <a className="button button--yellow" href="https://www.instagram.com/touargaofficiel/" target="_blank" rel="noreferrer">
              <Camera aria-hidden="true" size={19} /> Instagram
            </a>
            <a className="button button--outline" href="https://www.youtube.com/channel/UCeUf_mzzDOtsxY7E_p5PENA" target="_blank" rel="noreferrer">
              <Play aria-hidden="true" size={20} /> YouTube
            </a>
          </div>
        </div>
      </section>
    </>
  );
}