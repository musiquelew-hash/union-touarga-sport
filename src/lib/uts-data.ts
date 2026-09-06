import { decode } from "html-entities";
import { load } from "cheerio";

const SOFASCORE_API = "https://www.sofascore.com/api/v1";
const UTS_OFFICIAL_API = "https://touargaclub.ma/wp-json/wp/v2";
const SPORTSDB_API = "https://www.thesportsdb.com/api/v1/json/123";
const OFFICIAL_TEAM_PAGE_ID = 4523;
const SPORTSDB_UTS_TEAM_ID = 140801;
const SPORTSDB_BOTOLA_ID = 4520;

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

type SportsDbTeam = {
  idTeam?: string;
  strTeam?: string;
  strTeamShort?: string;
  strLocation?: string;
  strStadium?: string;
  intStadiumCapacity?: string;
  strBadge?: string;
};

type SportsDbEvent = {
  idEvent?: string;
  idHomeTeam?: string;
  idAwayTeam?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  strHomeTeamBadge?: string;
  strAwayTeamBadge?: string;
  intHomeScore?: string | number | null;
  intAwayScore?: string | number | null;
  intRound?: string | number | null;
  strLeague?: string;
  strSeason?: string;
  strTimestamp?: string;
  dateEvent?: string;
  strTime?: string;
  strVenue?: string;
};

type OfficialTeamPage = {
  modified?: string;
  content?: { rendered?: string };
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
  imageUrl: string | null;
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
  imageUrl: string | null;
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

async function safeFetchOfficial<T>(path: string, revalidate: number, timeout = 8000): Promise<T | null> {
  try {
    const response = await fetch(`${UTS_OFFICIAL_API}${path}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "UTS-Site/1.0",
      },
      next: { revalidate, tags: ["uts-official-content"] },
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) return null;
    return response.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function safeFetchSportsDb<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    const response = await fetch(`${SPORTSDB_API}${path}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "UTS-Site/1.0",
      },
      next: { revalidate, tags: ["uts-sports-data"] },
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

function normalizeLookup(value: string) {
  return decode(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function stableNumericId(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash || 1;
}

function isUtsTeam(name: string) {
  const normalized = normalizeLookup(name);
  return normalized.includes("union touarga") || normalized.includes("us touarga");
}

function cleanOfficialName(value: string) {
  const normalized = decode(value)
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/^[_\s-]+|[_\s-]+$/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("fr");

  return normalized
    .split(" ")
    .map((part) => part.charAt(0).toLocaleUpperCase("fr") + part.slice(1))
    .join(" ");
}

function integerValue(value: string) {
  const parsed = Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOfficialSportsPage(html: string) {
  if (!html) {
    return { players: [] as PlayerSummary[], standings: [] as StandingSummary[], season: null as string | null };
  }

  const $ = load(html);
  const positionHeadings = new Map<string, PlayerSummary["position"]>([
    ["gardiens", "Gardien"],
    ["defenseurs", "Défenseur"],
    ["milieux de terrain", "Milieu"],
    ["attaquants", "Attaquant"],
  ]);
  const players: PlayerSummary[] = [];
  const seenPlayers = new Set<string>();
  let currentPosition: PlayerSummary["position"] | null = null;

  $("h4, img").each((_index, element) => {
    const node = $(element);

    if (node.is("h4")) {
      currentPosition = positionHeadings.get(normalizeLookup(node.text())) || null;
      return;
    }

    if (!currentPosition) return;

    const name = cleanOfficialName(node.attr("alt") || "");
    const imageUrl = node.attr("data-lazy-src") || node.attr("data-src") || node.attr("src") || "";
    const key = normalizeLookup(name);

    if (!name || !key || seenPlayers.has(key) || !imageUrl.startsWith("http")) return;
    seenPlayers.add(key);
    players.push({
      id: stableNumericId(`player:${key}`),
      name,
      shortName: name,
      number: null,
      position: currentPosition,
      age: null,
      height: null,
      foot: null,
      nationality: "N.C.",
      countryCode: null,
      imageUrl,
      appearances: null,
      goals: null,
      assists: null,
      rating: null,
    });
  });

  const standings: StandingSummary[] = [];
  $("table").first().find("tr").each((_index, element) => {
    const cells = $(element)
      .find("td")
      .map((_cellIndex, cell) => $(cell).text().replace(/\s+/g, " ").trim())
      .get();

    if (cells.length < 10) return;

    const team = cells[1];
    const uts = isUtsTeam(team);
    standings.push({
      position: integerValue(cells[0]),
      teamId: uts ? UTS_TEAM_ID : stableNumericId(`team:${normalizeLookup(team)}`),
      team,
      shortName: uts ? "Union Touarga" : team,
      played: integerValue(cells[2]),
      won: integerValue(cells[3]),
      drawn: integerValue(cells[4]),
      lost: integerValue(cells[5]),
      goalDifference: integerValue(cells[8]),
      points: integerValue(cells[9]),
      zone: null,
      imageUrl: uts ? "/uts/crest-color.png" : null,
    });
  });

  const seasonMatch = $.root().text().match(/\b(20\d{2})\s*[-/]\s*(20\d{2})\b/);
  const season = seasonMatch ? `${seasonMatch[1]}/${seasonMatch[2].slice(-2)}` : null;

  return { players, standings, season };
}

function footballSeasons(referenceDate = new Date()) {
  const year = referenceDate.getUTCFullYear();
  const startYear = referenceDate.getUTCMonth() >= 6 ? year : year - 1;

  return {
    current: `${startYear}-${startYear + 1}`,
    previous: `${startYear - 1}-${startYear}`,
  };
}

function nullableNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function teamCode(name: string) {
  if (isUtsTeam(name)) return "UTS";
  const words = name.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map((word) => word[0]).join("") : name.slice(0, 3)).slice(0, 3).toUpperCase();
}

function toSportsDbTeam(id: string | undefined, name: string, badge?: string): TeamSummarySmall {
  const numericId = Number(id);
  const uts = numericId === SPORTSDB_UTS_TEAM_ID || isUtsTeam(name);

  return {
    id: uts ? UTS_TEAM_ID : Number.isFinite(numericId) && numericId > 0 ? numericId : stableNumericId(`team:${normalizeLookup(name)}`),
    name,
    shortName: uts ? "Union Touarga" : name,
    code: teamCode(name),
    imageUrl: uts ? "/uts/crest-color.png" : badge?.startsWith("http") ? badge : null,
  };
}

function normalizeSportsDbEvent(event: SportsDbEvent): MatchSummary | null {
  const homeName = event.strHomeTeam?.trim();
  const awayName = event.strAwayTeam?.trim();
  const dateTime = event.strTimestamp || (event.dateEvent ? `${event.dateEvent}T${event.strTime || "00:00:00"}Z` : "");
  const milliseconds = Date.parse(dateTime);

  if (!homeName || !awayName || !Number.isFinite(milliseconds)) return null;

  const homeScore = nullableNumber(event.intHomeScore);
  const awayScore = nullableNumber(event.intAwayScore);

  return {
    id: nullableNumber(event.idEvent) || stableNumericId(`event:${homeName}:${awayName}:${dateTime}`),
    timestamp: Math.floor(milliseconds / 1000),
    status: homeScore !== null && awayScore !== null ? "finished" : "scheduled",
    competition: event.strLeague || "Botola Pro",
    season: event.strSeason?.replace("-20", "/") || "Saison en cours",
    round: nullableNumber(event.intRound),
    home: toSportsDbTeam(event.idHomeTeam, homeName, event.strHomeTeamBadge),
    away: toSportsDbTeam(event.idAwayTeam, awayName, event.strAwayTeamBadge),
    homeScore,
    awayScore,
    venue: event.strVenue?.trim() || null,
  };
}

function normalizeSportsDbEvents(...collections: (SportsDbEvent[] | null | undefined)[]) {
  const uniqueEvents = new Map<string, SportsDbEvent>();

  collections.flatMap((events) => events || []).forEach((event) => {
    const key = event.idEvent || `${event.strHomeTeam}:${event.strAwayTeam}:${event.strTimestamp || event.dateEvent}`;
    uniqueEvents.set(key, event);
  });

  return [...uniqueEvents.values()]
    .filter((event) =>
      event.idHomeTeam === String(SPORTSDB_UTS_TEAM_ID) ||
      event.idAwayTeam === String(SPORTSDB_UTS_TEAM_ID) ||
      isUtsTeam(event.strHomeTeam || "") ||
      isUtsTeam(event.strAwayTeam || ""),
    )
    .map(normalizeSportsDbEvent)
    .filter((event): event is MatchSummary => event !== null);
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
  const seasons = footballSeasons();
  const [
    teamResponse,
    playersResponse,
    nextResponse,
    lastResponse,
    mediaResponse,
    seasonsResponse,
    newsResponse,
    officialTeamPage,
    sportsTeamResponse,
    sportsNextResponse,
    sportsLastResponse,
    sportsCurrentSeasonResponse,
    sportsPreviousSeasonResponse,
  ] =
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
      safeFetchOfficial<OfficialTeamPage>(`/pages/${OFFICIAL_TEAM_PAGE_ID}?context=view`, 1800, 30000),
      safeFetchSportsDb<{ teams?: SportsDbTeam[] | null }>("/searchteams.php?t=Union%20Touarga%20Sport", 21600),
      safeFetchSportsDb<{ events?: SportsDbEvent[] | null }>(`/eventsnext.php?id=${SPORTSDB_UTS_TEAM_ID}`, 300),
      safeFetchSportsDb<{ events?: SportsDbEvent[] | null }>(`/eventslast.php?id=${SPORTSDB_UTS_TEAM_ID}`, 300),
      safeFetchSportsDb<{ events?: SportsDbEvent[] | null }>(
        `/eventsseason.php?id=${SPORTSDB_BOTOLA_ID}&s=${seasons.current}`,
        600,
      ),
      safeFetchSportsDb<{ events?: SportsDbEvent[] | null }>(
        `/eventsseason.php?id=${SPORTSDB_BOTOLA_ID}&s=${seasons.previous}`,
        21600,
      ),
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
  const sportsTeam = sportsTeamResponse?.teams?.[0];
  const officialSports = parseOfficialSportsPage(officialTeamPage?.content?.rendered || "");
  const sofaPlayers = normalizePlayers(playersResponse?.players || []);
  const sofaStandings = normalizeStandings(standingsResponse?.standings?.[0]?.rows || []);
  const sofaUpcoming = normalizeEvents(nextResponse?.events || [], "scheduled");
  const sofaRecent = normalizeEvents(lastResponse?.events || [], "finished").slice(0, 12);
  const sportsMatches = normalizeSportsDbEvents(
    sportsNextResponse?.events,
    sportsLastResponse?.events,
    sportsCurrentSeasonResponse?.events,
    sportsPreviousSeasonResponse?.events,
  );
  const sportsUpcoming = sportsMatches
    .filter((match) => match.status === "scheduled")
    .sort((first, second) => first.timestamp - second.timestamp);
  const sportsRecent = sportsMatches
    .filter((match) => match.status === "finished")
    .sort((first, second) => second.timestamp - first.timestamp)
    .slice(0, 12);
  const players = sofaPlayers.length ? sofaPlayers : officialSports.players;
  const standings = sofaStandings.length ? sofaStandings : officialSports.standings;
  const upcomingMatches = sofaUpcoming.length ? sofaUpcoming : sportsUpcoming;
  const recentMatches = sofaRecent.length ? sofaRecent : sportsRecent;
  const coreSlices = [players.length > 0, standings.length >= 10, upcomingMatches.length + recentMatches.length > 0].filter(Boolean).length;

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
      : sportsTeam
        ? {
            id: UTS_TEAM_ID,
            name: sportsTeam.strTeam || fallbackTeam.name,
            shortName: sportsTeam.strTeamShort || fallbackTeam.shortName,
            code: fallbackTeam.code,
            manager: fallbackTeam.manager,
            city: sportsTeam.strLocation?.split(",")[0]?.trim() || fallbackTeam.city,
            venue: sportsTeam.strStadium || fallbackTeam.venue,
            venueCapacity: nullableNumber(sportsTeam.intStadiumCapacity),
          }
      : fallbackTeam,
    nextMatch: upcomingMatches[0] || (nextEvent ? normalizeMatch(nextEvent) : fallbackNextMatch),
    lastMatch: recentMatches[0] || (lastEvent ? normalizeMatch(lastEvent) : null),
    upcomingMatches: upcomingMatches.length ? upcomingMatches : [fallbackNextMatch],
    recentMatches,
    players,
    standings,
    standingsSeason: sofaStandings.length
      ? activeSeasonName
      : sportsUpcoming[0]?.season || officialSports.season || seasons.current.replace("-20", "/"),
    media: normalizeMedia(mediaResponse?.media || []),
    news: normalizeNews(newsResponse || []),
    freshness: coreSlices === 3 ? "live" : coreSlices > 0 || liveSlices > 0 ? "partial" : "fallback",
    updatedAt: new Date().toISOString(),
  };
}