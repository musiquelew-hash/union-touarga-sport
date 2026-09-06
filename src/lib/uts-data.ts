import { decode } from "html-entities";
import { load } from "cheerio";
import { getCmsCategorySafe } from "@/lib/relational-cms-db";

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

export type StaffSummary = {
  id: number;
  name: string;
  role: string;
  department: "Technique" | "Médical" | "Direction" | "Autre";
  imageUrl: string;
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
  staff: StaffSummary[];
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

function integerValue(value: string) {
  const parsed = Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOfficialStandings(html: string) {
  if (!html) {
    return { standings: [] as StandingSummary[], season: null as string | null };
  }

  const $ = load(html);
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

  return { standings, season };
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

export async function getPublicUtsData(): Promise<UtsData> {
  const seasons = footballSeasons();
  const [
    nextResponse,
    lastResponse,
    seasonsResponse,
    officialTeamPage,
    sportsNextResponse,
    sportsLastResponse,
    sportsCurrentSeasonResponse,
    sportsPreviousSeasonResponse,
  ] =
    await Promise.all([
      safeFetch<{ events?: SofaEvent[] }>(`/team/${UTS_TEAM_ID}/events/next/0`, 300),
      safeFetch<{ events?: SofaEvent[] }>(`/team/${UTS_TEAM_ID}/events/last/0`, 300),
      safeFetch<{ seasons?: { id: number; name: string }[] }>(
        `/unique-tournament/${BOTOLA_TOURNAMENT_ID}/seasons`,
        21600,
      ),
      safeFetchOfficial<OfficialTeamPage>(`/pages/${OFFICIAL_TEAM_PAGE_ID}?context=view`, 1800, 30000),
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
  const liveSlices = [nextResponse, lastResponse, standingsResponse, officialTeamPage].filter(Boolean).length;
  const officialStandings = parseOfficialStandings(officialTeamPage?.content?.rendered || "");
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
  const standings = sofaStandings.length ? sofaStandings : officialStandings.standings;
  const upcomingMatches = sofaUpcoming.length ? sofaUpcoming : sportsUpcoming;
  const recentMatches = sofaRecent.length ? sofaRecent : sportsRecent;
  const coreSlices = [standings.length >= 10, upcomingMatches.length + recentMatches.length > 0].filter(Boolean).length;

  return {
    team: fallbackTeam,
    nextMatch: upcomingMatches[0] || (nextEvent ? normalizeMatch(nextEvent) : null),
    lastMatch: recentMatches[0] || (lastEvent ? normalizeMatch(lastEvent) : null),
    upcomingMatches,
    recentMatches,
    players: [],
    staff: [],
    standings,
    standingsSeason: sofaStandings.length
      ? activeSeasonName
      : sportsUpcoming[0]?.season || officialStandings.season || seasons.current.replace("-20", "/"),
    media: [],
    news: [],
    freshness: coreSlices === 2 ? "live" : coreSlices > 0 || liveSlices > 0 ? "partial" : "fallback",
    updatedAt: new Date().toISOString(),
  };
}

export async function getUtsData(): Promise<UtsData> {
  const [publicData, players, staff, news, media] = await Promise.all([
    getPublicUtsData(),
    getCmsCategorySafe<PlayerSummary>("player"),
    getCmsCategorySafe<StaffSummary>("staff"),
    getCmsCategorySafe<NewsSummary>("news"),
    getCmsCategorySafe<MediaSummary>("media"),
  ]);

  return {
    ...publicData,
    players: players.records.map((record) => record.data),
    staff: staff.records.map((record) => record.data),
    news: news.records.map((record) => record.data),
    media: media.records.map((record) => record.data),
  };
}