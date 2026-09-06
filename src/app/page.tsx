import { ArrowRight, ArrowUpRight, Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DataStatus } from "@/components/data-status";
import { MatchCard } from "@/components/match-card";
import { NewsCard } from "@/components/news-card";
import { PlayerCard } from "@/components/player-card";
import { StandingsTable } from "@/components/standings-table";
import { formatShortDate, formatTime } from "@/lib/format";
import { getUtsData, UTS_TEAM_ID } from "@/lib/uts-data";

function getHomeStandings(rows: Awaited<ReturnType<typeof getUtsData>>["standings"]) {
  if (rows.length <= 7) return rows;

  const utsIndex = rows.findIndex((row) => row.teamId === UTS_TEAM_ID);
  if (utsIndex < 3) return rows.slice(0, 7);

  const selected = [...rows.slice(0, 3), ...rows.slice(Math.max(3, utsIndex - 1), utsIndex + 3)];
  return selected.filter((row, index, all) => all.findIndex((item) => item.teamId === row.teamId) === index).slice(0, 7);
}

function getFeaturedPlayers(players: Awaited<ReturnType<typeof getUtsData>>["players"]) {
  const positions = ["Gardien", "Défenseur", "Milieu", "Attaquant"] as const;
  const selected = positions.map((position) => players.find((player) => player.position === position)).filter(Boolean);

  for (const player of players) {
    if (selected.length === 4) break;
    if (!selected.some((item) => item?.id === player.id)) selected.push(player);
  }

  return selected.slice(0, 4);
}

export default async function Home() {
  const data = await getUtsData();
  const nextMatch = data.nextMatch;
  const standings = getHomeStandings(data.standings);
  const featuredPlayers = getFeaturedPlayers(data.players);

  return (
    <>
      <section className="home-hero">
        <Image
          className="home-hero__image"
          src="/uts/hero-candidate.jpg"
          alt="L’ensemble des équipes et du staff de l’Union Touarga Sport"
          fill
          priority
          sizes="100vw"
        />
        <div className="shell home-hero__inner">
          <div className="home-hero__content">
            <div className="home-hero__meta">
              <DataStatus data={data} inverse />
              <span>Équipe première · Botola Pro</span>
            </div>
            <p className="home-hero__kicker">Rabat · Depuis 1969</p>
            <h1>
              Union
              <span>Touarga Sport</span>
            </h1>
            <p className="home-hero__lead">
              <strong>Fiers de nos valeurs.</strong> Une identité née à Touarga, une ambition portée par
              toute une ville et un football qui avance ensemble.
            </p>
            <div className="home-hero__actions">
              <Link className="button button--yellow" href="/matchs">
                Voir les matchs <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <Link className="button button--outline" href="/club">
                Découvrir le club <ArrowUpRight aria-hidden="true" size={18} />
              </Link>
            </div>
          </div>
          {nextMatch && (
            <aside className="home-hero__match">
              <div className="hero-fixture">
              <div className="hero-fixture__label">
                <strong>Prochain match</strong>
                <small>{nextMatch.competition} · J{nextMatch.round || "–"}</small>
              </div>
              <div className="hero-fixture__teams">
                <div className="hero-fixture__team">
                  {nextMatch.home.imageUrl ? (
                    <Image src={nextMatch.home.imageUrl} alt="" width={52} height={52} />
                  ) : (
                    <span className="hero-fixture__monogram" aria-hidden="true">{nextMatch.home.code}</span>
                  )}
                  <strong>{nextMatch.home.shortName}</strong>
                </div>
                <span className="hero-fixture__versus">VS</span>
                <div className="hero-fixture__team">
                  {nextMatch.away.imageUrl ? (
                    <Image src={nextMatch.away.imageUrl} alt="" width={52} height={52} />
                  ) : (
                    <span className="hero-fixture__monogram" aria-hidden="true">{nextMatch.away.code}</span>
                  )}
                  <strong>{nextMatch.away.shortName}</strong>
                </div>
              </div>
              <div className="hero-fixture__date">
                <strong>{formatShortDate(nextMatch.timestamp)}</strong>
                <small>{formatTime(nextMatch.timestamp)} · Rabat</small>
              </div>
              </div>
              <Link className="hero-fixture__link" href="/matchs">
                Fiche du match <ArrowUpRight aria-hidden="true" size={16} />
              </Link>
            </aside>
          )}
        </div>
        <span className="home-hero__monogram" aria-hidden="true">UTS</span>
      </section>

      <div className="identity-ticker" aria-hidden="true">
        <div className="identity-ticker__track">
          {[...Array(2)].flatMap((_, repeat) =>
            ["Union Touarga Sport", "Fiers de nos valeurs", "Rabat", "Depuis 1969", "Botola Pro"].map((label) => (
              <span key={`${repeat}-${label}`}>{label}</span>
            )),
          )}
        </div>
      </div>

      <section className="section home-match-section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow">01 · Centre du match</span>
              <h2>Le prochain rendez-vous</h2>
            </div>
            <p>Calendrier et résultats sont synchronisés automatiquement pour suivre l’équipe sans attendre.</p>
          </div>
          <div className="home-scoreboard">
            {nextMatch && <MatchCard match={nextMatch} label="À venir" featured />}
            {data.lastMatch && <MatchCard match={data.lastMatch} label="Dernier résultat" />}
          </div>
        </div>
      </section>

      <section className="section standings-section">
        <div className="shell standings-panel">
          <div className="standings-panel__intro">
            <span className="eyebrow eyebrow--yellow">Botola Pro</span>
            <h2>La course au classement</h2>
            <p>
              {data.standings.every((row) => row.played === 0)
                ? "La saison est en phase de lancement. Le tableau se mettra à jour dès les premières rencontres."
                : "Les leaders et la position de l’UTS, actualisés au rythme du championnat."}
            </p>
            <Link className="button button--yellow" href="/classement">
              Classement complet <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </div>
          {standings.length > 0 ? (
            <StandingsTable rows={standings} compact />
          ) : (
            <div className="empty-state">
              <Shield aria-hidden="true" size={32} />
              <h2>Classement en attente</h2>
              <p>Les données du championnat seront affichées dès leur prochaine synchronisation.</p>
            </div>
          )}
        </div>
      </section>

      <section className="section section--white team-section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow">02 · Équipe première</span>
              <h2>Les visages du terrain</h2>
            </div>
            <Link className="button button--dark" href="/equipe">
              Tout l’effectif <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </div>
          {featuredPlayers.length > 0 ? (
            <div className="players-grid">
              {featuredPlayers.map((player) => player && <PlayerCard key={player.id} player={player} />)}
            </div>
          ) : (
            <div className="empty-state">
              <Shield aria-hidden="true" size={32} />
              <h2>Effectif en cours de synchronisation</h2>
              <p>Les fiches des joueurs reviendront automatiquement dès que la source sera disponible.</p>
            </div>
          )}
        </div>
      </section>

      <section className="home-manifesto">
        <div className="home-manifesto__visual">
          <Image
            src="/uts/team.jpg"
            alt="Une équipe de l’Union Touarga Sport avant une rencontre"
            fill
            sizes="(max-width: 820px) 100vw, 58vw"
          />
          <span>Formation · Rabat</span>
        </div>
        <div className="home-manifesto__copy">
          <span className="eyebrow eyebrow--yellow">03 · Plus qu’un club</span>
          <h2>Former le jeu.<br />Former les hommes.</h2>
          <p>
            L’Union Touarga Sport porte une culture de proximité, de formation et de persévérance. Le club
            grandit sans perdre le lien qui l’unit à sa ville et à celles et ceux qui l’accompagnent.
          </p>
          <div className="home-manifesto__facts" aria-label="Repères du club">
            <span><strong>1969</strong> Fondation</span>
            <span><strong>Rabat</strong> Notre ville</span>
            <span><strong>UTS</strong> Notre union</span>
          </div>
          <Link className="button button--yellow" href="/club">
            Notre histoire <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
      </section>

      <section className="section home-news-section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow">04 · Actualités officielles</span>
              <h2>Touarga, maintenant</h2>
            </div>
            <a className="button button--dark" href="https://touargaclub.ma/nos-news/" target="_blank" rel="noreferrer">
              Toutes les actualités <ArrowUpRight aria-hidden="true" size={17} />
            </a>
          </div>
          {data.news.length > 0 ? (
            <div className="news-grid home-news-grid">
              {data.news.slice(0, 3).map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Shield aria-hidden="true" size={32} />
              <h2>Actualités en cours de synchronisation</h2>
              <p>Les publications officielles reviendront automatiquement dès que le flux sera disponible.</p>
            </div>
          )}
        </div>
      </section>

      <section className="section home-gallery-section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow eyebrow--yellow">05 · Dans l’objectif</span>
              <h2>Vivre le club de l’intérieur</h2>
            </div>
            <Link className="button button--outline" href="/medias">
              Toute la médiathèque <ArrowUpRight aria-hidden="true" size={17} />
            </Link>
          </div>
          <div className="home-gallery">
            <figure className="home-gallery__item home-gallery__item--lead">
              <Image src="/uts/match-01.jpg" alt="Célébration du titre de l’équipe futsal UTS" fill sizes="(max-width: 820px) 100vw, 58vw" />
              <figcaption><span>Futsal</span><strong>Le titre, ensemble</strong></figcaption>
            </figure>
            <figure className="home-gallery__item">
              <Image src="/uts/match-02.jpg" alt="Photo collective des champions UTS" fill sizes="(max-width: 820px) 100vw, 34vw" />
              <figcaption><span>Club</span><strong>Une fierté partagée</strong></figcaption>
            </figure>
            <figure className="home-gallery__item">
              <Image src="/uts/portrait.jpg" alt="Membre du staff UTS au bord du terrain" fill sizes="(max-width: 820px) 100vw, 34vw" />
              <figcaption><span>Terrain</span><strong>L’exigence au quotidien</strong></figcaption>
            </figure>
          </div>
        </div>
      </section>
    </>
  );
}
