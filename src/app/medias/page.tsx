import type { Metadata } from "next";
import { Camera, Newspaper, Play, Video } from "lucide-react";
import Image from "next/image";
import { MediaCard } from "@/components/media-card";
import { NewsCard } from "@/components/news-card";
import { PageHeading } from "@/components/page-heading";
import { getSiteContent } from "@/lib/site-content";
import { getUtsData } from "@/lib/uts-data";

export const metadata: Metadata = {
  title: "Actualités et médias",
  description: "Vidéos, actualités et réseaux officiels de l'Union Touarga Sport.",
};

export default async function MediaPage() {
  const [data, content] = await Promise.all([getUtsData(), getSiteContent()]);

  return (
    <>
      <PageHeading
        eyebrow="Touarga TV"
        title="Actualités & médias"
        intro="Les dernières images de l'UTS et les publications éditoriales du club, réunies dans un même espace."
        image="/uts/match-01.jpg"
        imageAlt="Les joueurs UTS célèbrent un titre au milieu des confettis"
        imagePosition="center"
      />

      <section className="content-band content-band--white">
        <div className="shell">
          <div className="content-band__heading">
            <h2>Médiathèque</h2>
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
              <h2>Aucun média publié</h2>
              <p>Les images et vidéos apparaîtront après leur publication depuis le dashboard.</p>
            </div>
          )}
        </div>
      </section>

      <section className="content-band content-band--white">
        <div className="shell">
          <div className="content-band__heading">
            <h2>Actualités officielles</h2>
            <p>{data.news.length} publication{data.news.length > 1 ? "s" : ""}</p>
          </div>
          {data.news.length > 0 ? (
            <div className="news-grid media-news-grid">
              {data.news.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Newspaper aria-hidden="true" size={32} />
              <h2>Aucune actualité publiée</h2>
              <p>Les publications apparaîtront après leur mise en ligne depuis le dashboard.</p>
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
            <a className="button button--yellow" href={content.instagramUrl} target="_blank" rel="noreferrer">
              <Camera aria-hidden="true" size={19} /> Instagram
            </a>
            <a className="button button--outline" href={content.youtubeUrl} target="_blank" rel="noreferrer">
              <Play aria-hidden="true" size={20} /> YouTube
            </a>
          </div>
        </div>
      </section>
    </>
  );
}