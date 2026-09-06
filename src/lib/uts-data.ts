import { decode } from "html-entities";

const SOFASCORE_API = "https://www.sofascore.com/api/v1";
const UTS_OFFICIAL_API = "https://touargaclub.ma/wp-json/wp/v2";

export const UTS_TEAM_ID = 118834;
export const BOTOLA_TOURNAMENT_ID = 937;

type DataFreshness = "live" | "partial" | "fallback";

type SofaTeam = {
  id: number;
  name: string;
  shortName?: string;
  nameCode?: string;
};

type SofaEvent = {
  id: number;
  startTimestamp: number;
  status: { type: string };
  tournament?: { name?: string; uniqueTournament?: { id?: number } };
  season?: { id?: number; name?: string };
  roundInfo?: { round?: number };
  homeTeam: SofaTeam;
  awayTeam: SofaTeam;
  homeScore?: { current?: number; display?: number };
  awayScore?: { current?: number; display?: number };
  venue?: { stadium?: { name?: string }; city?: { name?: string } };
};

type SofaPlayer = {
  id: number;
  name: string;
  shortName?: string;
  position?: string;
  jerseyNumber?: string;
  dateOfBirthTimestamp?: number;
  height?: number;
  preferredFoot?: string;
  country?: { name?: string; alpha2?: string };
  team?: { id?: number };
};

type SofaPlayerEntry = {
  player: SofaPlayer;
  statistics?: {
    appearances?: number;
    goals?: number;
    assists?: number;
    rating?: number;
  };
};

type SofaStandingRow = {
  position: number;
  team: SofaTeam;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  scoresFor: number;
  scoresAgainst: number;
  points: number;
  promotion?: { text?: string };
};

type SofaMedia = {
  id?: number | string;
  title?: string;
  subtitle?: string;
  url?: string;
  thumbnailUrl?: string;
  createdAtTimestamp?: number;
  date?: number;
};

type OfficialPost = {
  id: number;
  date?: string;
  link?: string;
  title?: { rendered?: string };
  jetpack_featured_media_url?: string;
  _embedded?: {
    "wp:featuredmedia"?: { source_url?: string; alt_text?: string }[];
  };
};

export type TeamSummary = {
  id: number;
  name: string;
  shortName: string;
  code: string;
  manager: string;
  city: string;
  venue: string;
  venueCapacity: number | null;
};

export type MatchSummary = {
  id: number;
  timestamp: number;
  status: "scheduled" | "finished";
  competition: string;
  season: string;
  round: number | null;
  home: TeamSummarySmall;
  away: TeamSummarySmall;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
};

export type TeamSummarySmall = {
  id: number;
  name: string;
  shortName: string;
  code: string;
  imageUrl: string;
};

export type PlayerSummary = {
  id: number;
  name: string;
  shortName: string;
  number: string | null;
  position: "Gardien" | "Défenseur" | "Milieu" | "Attaquant" | "Joueur";
  age: number | null;
  height: number | null;
  foot: string | null;
  nationality: string;
  countryCode: string | null;
  imageUrl: string;
  appearances: number | null;
  goals: number | null;
  assists: number | null;
  rating: number | null;
};

export type StandingSummary = {
  position: number;
  teamId: number;
  team: string;
  shortName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDifference: number;
  points: number;
  zone: string | null;
  imageUrl: string;
};

export type MediaSummary = {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string | null;
  timestamp: number | null;
};

export type NewsSummary = {
  id: number;
  title: string;
  url: string;
  imageUrl: string | null;
  imageAlt: string;
  timestamp: number | null;
};

export type UtsData = {
  team: TeamSummary;
  nextMatch: MatchSummary | null;
  lastMatch: MatchSummary | null;
  upcomingMatches: MatchSummary[];
  recentMatches: MatchSummary[];
  players: PlayerSummary[];
  standings: StandingSummary[];
  standingsSeason: string;
  media: MediaSummary[];
  news: NewsSummary[];
  freshness: DataFreshness;
  updatedAt: string;
};

const fallbackTeam: TeamSummary = {
  id: UTS_TEAM_ID,
  name: "Union Touarga Sport",
  shortName: "Union Touarga",
  code: "UTS",
  manager: "Staff technique UTS",
  city: "Rabat",
  venue: "Stade Al Medina",
  venueCapacity: null,
};

const fallbackNextMatch: MatchSummary = {
  id: 16958239,
  timestamp: 1790269200,
  status: "scheduled",
  competition: "Botola Pro D1",
  season: "2026/27",
  round: 1,
  home: toSmallTeam({ id: UTS_TEAM_ID, name: "Union Touarga Sport", shortName: "Union Touarga", nameCode: "TOU" }),
  away: toSmallTeam({ id: 55027, name: "Fath Union Sport", shortName: "FUS Rabat", nameCode: "FUS" }),
  homeScore: null,
  awayScore: null,
  venue: "Rabat",
};

async function fetchSofa<T>(path: string, revalidate: number): Promise<T> {
  const response = await fetch(`${SOFASCORE_API}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate, tags: ["uts-sports-data"] },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Sofascore ${response.status}: ${path}`);
  }

  return response.json() as Promise<T>;
}

async function safeFetch<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    return await fetchSofa<T>(path, revalidate);
  } catch {
    return null;
  }
}

async function safeFetchOfficial<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    const response = await fetch(`${UTS_OFFICIAL_API}${path}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "UTS-Site/1.0",
      },
      next: { revalidate, tags: ["uts-official-content"] },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;
    return response.json() as Promise<T>;
  } catch {
    return null;
  }
}

function teamImageUrl(teamId: number) {
  return `https://img.sofascore.com/api/v1/team/${teamId}/image`;
}

function playerImageUrl(playerId: number) {
  return `https://img.sofascore.com/api/v1/player/${playerId}/image`;
}

function toSmallTeam(team: SofaTeam): TeamSummarySmall {
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName || team.name,
    code: team.nameCode || team.shortName?.slice(0, 3).toUpperCase() || "CLB",
    imageUrl: teamImageUrl(team.id),
  };
}

function normalizeMatch(event: SofaEvent): MatchSummary {
  const score = (value?: { current?: number; display?: number }) =>
    value?.current ?? value?.display ?? null;

  return {
    id: event.id,
    timestamp: event.startTimestamp,
    status: event.status.type === "finished" ? "finished" : "scheduled",
    competition: event.tournament?.name || "Compétition nationale",
    season: event.season?.name?.replace(/^.*?(\d{2}\/\d{2})$/, "$1") || "Saison en cours",
    round: event.roundInfo?.round ?? null,
    home: toSmallTeam(event.homeTeam),
    away: toSmallTeam(event.awayTeam),
    homeScore: score(event.homeScore),
    awayScore: score(event.awayScore),
    venue: event.venue?.stadium?.name || event.venue?.city?.name || null,
  };
}

function newestEvent(events: SofaEvent[], status: "finished" | "scheduled") {
  const validEvents = events.filter((event) =>
    status === "finished" ? event.status.type === "finished" : event.status.type !== "finished",
  );

  return validEvents.sort((first, second) =>
    status === "finished"
      ? second.startTimestamp - first.startTimestamp
      : first.startTimestamp - second.startTimestamp,
  )[0];
}

function normalizeEvents(events: SofaEvent[], status: "finished" | "scheduled") {
  return events
    .filter((event) =>
      status === "finished" ? event.status.type === "finished" : event.status.type !== "finished",
    )
    .sort((first, second) =>
      status === "finished"
        ? second.startTimestamp - first.startTimestamp
        : first.startTimestamp - second.startTimestamp,
    )
    .map(normalizeMatch);
}

function positionLabel(position?: string): PlayerSummary["position"] {
  const labels: Record<string, PlayerSummary["position"]> = {
    G: "Gardien",
    D: "Défenseur",
    M: "Milieu",
    F: "Attaquant",
  };

  return (position && labels[position]) || "Joueur";
}

function playerAge(timestamp?: number) {
  if (!timestamp) return null;

  const birthDate = new Date(timestamp * 1000);
  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDifference = today.getUTCMonth() - birthDate.getUTCMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getUTCDate() < birthDate.getUTCDate())) {
    age -= 1;
  }

  return age;
}

function footLabel(foot?: string) {
  const labels: Record<string, string> = {
    Right: "Droit",
    Left: "Gauche",
    Both: "Les deux",
  };

  return foot ? labels[foot] || foot : null;
}

function normalizePlayers(entries: SofaPlayerEntry[]) {
  return entries
    .filter(({ player }) => !player.team?.id || player.team.id === UTS_TEAM_ID)
    .map(({ player, statistics }): PlayerSummary => ({
      id: player.id,
      name: player.name,
      shortName: player.shortName || player.name,
      number: player.jerseyNumber || null,
      position: positionLabel(player.position),
      age: playerAge(player.dateOfBirthTimestamp),
      height: player.height || null,
      foot: footLabel(player.preferredFoot),
      nationality: player.country?.name || "Maroc",
      countryCode: player.country?.alpha2 || null,
      imageUrl: playerImageUrl(player.id),
      appearances: statistics?.appearances ?? null,
      goals: statistics?.goals ?? null,
      assists: statistics?.assists ?? null,
      rating: statistics?.rating ?? null,
    }))
    .sort((first, second) => {
      const order = ["Gardien", "Défenseur", "Milieu", "Attaquant", "Joueur"];
      return order.indexOf(first.position) - order.indexOf(second.position) || first.name.localeCompare(second.name, "fr");
    });
}

function normalizeStandings(rows: SofaStandingRow[]) {
  return rows.map((row): StandingSummary => ({
    position: row.position,
    teamId: row.team.id,
    team: row.team.name,
    shortName: row.team.shortName || row.team.name,
    played: row.matches,
    won: row.wins,
    drawn: row.draws,
    lost: row.losses,
    goalDifference: row.scoresFor - row.scoresAgainst,
    points: row.points,
    zone: row.promotion?.text || null,
    imageUrl: teamImageUrl(row.team.id),
  }));
}

function normalizeMedia(items: SofaMedia[]) {
  return items
    .filter((item) => item.title && item.url)
    .map((item, index): MediaSummary => ({
      id: String(item.id || item.url || index),
      title: item.title || "Vidéo UTS",
      url: item.url || "#",
      thumbnailUrl: item.thumbnailUrl || null,
      timestamp: item.createdAtTimestamp || item.date || null,
    }))
    .slice(0, 8);
}

function normalizeNews(posts: OfficialPost[]) {
  return posts
    .filter((post) => post.title?.rendered && post.link)
    .map((post): NewsSummary => {
      const featuredMedia = post._embedded?.["wp:featuredmedia"]?.[0];

      return {
        id: post.id,
        title: decode(post.title?.rendered || "Actualité UTS"),
        url: post.link || "https://touargaclub.ma/nos-news/",
        imageUrl: featuredMedia?.source_url || post.jetpack_featured_media_url || null,
        imageAlt: featuredMedia?.alt_text || "",
        timestamp: post.date ? Math.floor(new Date(post.date).getTime() / 1000) : null,
      };
    })
    .slice(0, 6);
}

export async function getUtsData(): Promise<UtsData> {
  const [teamResponse, playersResponse, nextResponse, lastResponse, mediaResponse, seasonsResponse, newsResponse] =
    await Promise.all([
      safeFetch<{
        team: SofaTeam & {
          manager?: { name?: string };
          venue?: { name?: string; city?: { name?: string }; capacity?: number };
        };
      }>(`/team/${UTS_TEAM_ID}`, 3600),
      safeFetch<{ players?: SofaPlayerEntry[] }>(`/team/${UTS_TEAM_ID}/players`, 3600),
      safeFetch<{ events?: SofaEvent[] }>(`/team/${UTS_TEAM_ID}/events/next/0`, 300),
      safeFetch<{ events?: SofaEvent[] }>(`/team/${UTS_TEAM_ID}/events/last/0`, 300),
      safeFetch<{ media?: SofaMedia[] }>(`/team/${UTS_TEAM_ID}/media`, 1800),
      safeFetch<{ seasons?: { id: number; name: string }[] }>(
        `/unique-tournament/${BOTOLA_TOURNAMENT_ID}/seasons`,
        21600,
      ),
      safeFetchOfficial<OfficialPost[]>("/posts?per_page=6&_embed=1", 1800),
    ]);

  const nextEvent = newestEvent(nextResponse?.events || [], "scheduled");
  const lastEvent = newestEvent(lastResponse?.events || [], "finished");
  const activeSeasonId = nextEvent?.season?.id || seasonsResponse?.seasons?.[0]?.id || 102220;
  const activeSeasonName =
    nextEvent?.season?.name || seasonsResponse?.seasons?.find((season) => season.id === activeSeasonId)?.name || "Botola Pro";
  const standingsResponse = await safeFetch<{ standings?: { rows?: SofaStandingRow[] }[] }>(
    `/unique-tournament/${BOTOLA_TOURNAMENT_ID}/season/${activeSeasonId}/standings/total`,
    600,
  );
  const liveSlices = [teamResponse, playersResponse, nextResponse, lastResponse, mediaResponse, standingsResponse].filter(Boolean).length;
  const sourceTeam = teamResponse?.team;

  return {
    team: sourceTeam
      ? {
          id: sourceTeam.id,
          name: sourceTeam.name,
          shortName: sourceTeam.shortName || fallbackTeam.shortName,
          code: sourceTeam.nameCode || fallbackTeam.code,
          manager: sourceTeam.manager?.name || fallbackTeam.manager,
          city: sourceTeam.venue?.city?.name || fallbackTeam.city,
          venue: sourceTeam.venue?.name || fallbackTeam.venue,
          venueCapacity: sourceTeam.venue?.capacity || null,
        }
      : fallbackTeam,
    nextMatch: nextEvent ? normalizeMatch(nextEvent) : fallbackNextMatch,
    lastMatch: lastEvent ? normalizeMatch(lastEvent) : null,
    upcomingMatches: nextResponse?.events?.length
      ? normalizeEvents(nextResponse.events, "scheduled")
      : [fallbackNextMatch],
    recentMatches: normalizeEvents(lastResponse?.events || [], "finished").slice(0, 12),
    players: normalizePlayers(playersResponse?.players || []),
    standings: normalizeStandings(standingsResponse?.standings?.[0]?.rows || []),
    standingsSeason: activeSeasonName,
    media: normalizeMedia(mediaResponse?.media || []),
    news: normalizeNews(newsResponse || []),
    freshness: liveSlices === 6 ? "live" : liveSlices > 0 ? "partial" : "fallback",
    updatedAt: new Date().toISOString(),
  };
}