import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { ensureCmsSchema } from "@/lib/relational-cms-db";
import { getDatabasePool, isDatabaseConfigured } from "@/lib/database";
import {
  getPublicUtsData,
  type MatchSummary,
  type StandingSummary,
  type TeamSummarySmall,
} from "@/lib/uts-data";

export const sportsProviders = ["manual", "sofascore", "thesportsdb"] as const;
export type SportsProvider = (typeof sportsProviders)[number];
export const sportsTeamTypes = ["men", "women", "youth"] as const;
export type SportsTeamType = (typeof sportsTeamTypes)[number];

export type ClubTeam = {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  categoryLabel: string;
  type: SportsTeamType;
  description: string;
  heroImageUrl: string;
  apiProvider: SportsProvider;
  apiTeamId: string | null;
  apiTournamentId: string | null;
  apiLeagueId: string | null;
  primary: boolean;
  published: boolean;
  sortOrder: number;
};

export type SportsMatch = MatchSummary & {
  key: string;
  sourceName: "dashboard" | "sofascore" | "thesportsdb";
  roundLabel: string | null;
  reportUrl: string | null;
  featured: boolean;
  published: boolean;
  manualLock: boolean;
};

export type SportsStanding = StandingSummary & {
  key: string;
  season: string;
  sourceName: "dashboard" | "sofascore" | "thesportsdb";
  goalsFor: number;
  goalsAgainst: number;
  published: boolean;
  manualLock: boolean;
};

export type TeamSportsData = {
  team: ClubTeam;
  upcomingMatches: SportsMatch[];
  recentMatches: SportsMatch[];
  standings: SportsStanding[];
  season: string;
  freshness: "live" | "stored" | "manual" | "unavailable";
};

type TeamRow = RowDataPacket & {
  team_id: number;
  slug: string;
  name: string;
  short_name: string;
  category_label: string;
  team_type: SportsTeamType;
  description_text: string;
  hero_image_url: string;
  api_provider: SportsProvider;
  api_team_id: string | null;
  api_tournament_id: string | null;
  api_league_id: string | null;
  is_primary: boolean | number;
  is_published: boolean | number;
  sort_order: number;
};

type MatchRow = RowDataPacket & {
  match_id: number;
  record_key: string;
  external_id: string | null;
  source_name: SportsMatch["sourceName"];
  starts_at: Date | string;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled";
  competition_name: string;
  season_label: string;
  round_label: string | null;
  home_name: string;
  home_short_name: string;
  home_code: string;
  home_badge_url: string | null;
  away_name: string;
  away_short_name: string;
  away_code: string;
  away_badge_url: string | null;
  home_score: number | null;
  away_score: number | null;
  venue: string | null;
  match_report_url: string | null;
  is_featured: boolean | number;
  is_published: boolean | number;
  manual_lock: boolean | number;
};

type StandingRow = RowDataPacket & {
  standing_id: number;
  record_key: string;
  season_label: string;
  source_name: SportsStanding["sourceName"];
  external_team_id: string | null;
  position_number: number;
  club_name: string;
  club_short_name: string;
  club_badge_url: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  points: number;
  zone_label: string | null;
  is_published: boolean | number;
  manual_lock: boolean | number;
};

type SofaTeam = { id: number; name: string; shortName?: string; nameCode?: string };
type SofaEvent = {
  id: number;
  startTimestamp: number;
  status: { type: string };
  tournament?: { name?: string };
  season?: { id?: number; name?: string };
  roundInfo?: { round?: number };
  homeTeam: SofaTeam;
  awayTeam: SofaTeam;
  homeScore?: { current?: number; display?: number };
  awayScore?: { current?: number; display?: number };
  venue?: { stadium?: { name?: string }; city?: { name?: string } };
};
type SofaStanding = {
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

const SOFASCORE_API = "https://www.sofascore.com/api/v1";
const SPORTSDB_API = "https://www.thesportsdb.com/api/v1/json/123";
const PRIMARY_TEAM_ID = 118834;

const fallbackTeams: ClubTeam[] = [
  {
    id: 1,
    slug: "masculine",
    name: "Équipe masculine",
    shortName: "Masculins",
    categoryLabel: "Équipe première",
    type: "men",
    description: "L’équipe première de l’Union Touarga Sport engagée dans l’élite du football marocain.",
    heroImageUrl: "/uts/hero-candidate.jpg",
    apiProvider: "sofascore",
    apiTeamId: "118834",
    apiTournamentId: "937",
    apiLeagueId: "4520",
    primary: true,
    published: true,
    sortOrder: 10,
  },
  {
    id: 2,
    slug: "feminine",
    name: "Équipe féminine",
    shortName: "Féminines",
    categoryLabel: "Équipe féminine",
    type: "women",
    description: "Le projet féminin de l’Union Touarga Sport, porté par la même ambition et les mêmes couleurs.",
    heroImageUrl: "/uts/team.jpg",
    apiProvider: "manual",
    apiTeamId: null,
    apiTournamentId: null,
    apiLeagueId: null,
    primary: false,
    published: true,
    sortOrder: 20,
  },
  ...["u21", "u19", "u17"].map((slug, index): ClubTeam => ({
    id: index + 3,
    slug,
    name: `Équipe ${slug.toUpperCase()}`,
    shortName: slug.toUpperCase(),
    categoryLabel: `Formation ${slug.toUpperCase()}`,
    type: "youth",
    description: "La formation des jeunes talents de l’Union Touarga Sport.",
    heroImageUrl: "/uts/story.jpg",
    apiProvider: "manual",
    apiTeamId: null,
    apiTournamentId: null,
    apiLeagueId: null,
    primary: false,
    published: true,
    sortOrder: (index + 3) * 10,
  })),
];

function mapTeam(row: TeamRow): ClubTeam {
  return {
    id: Number(row.team_id),
    slug: row.slug,
    name: row.name,
    shortName: row.short_name,
    categoryLabel: row.category_label,
    type: row.team_type,
    description: row.description_text,
    heroImageUrl: row.hero_image_url,
    apiProvider: row.api_provider,
    apiTeamId: row.api_team_id,
    apiTournamentId: row.api_tournament_id,
    apiLeagueId: row.api_league_id,
    primary: Boolean(row.is_primary),
    published: Boolean(row.is_published),
    sortOrder: Number(row.sort_order),
  };
}

function toTimestamp(value: Date | string) {
  return Math.floor(new Date(value).getTime() / 1000);
}

function codeFor(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map((word) => word[0]).join("") : name.slice(0, 3)).slice(0, 3).toUpperCase();
}

function mapMatch(row: MatchRow): SportsMatch {
  return {
    id: Number(row.external_id) || Number(row.match_id),
    key: row.record_key,
    timestamp: toTimestamp(row.starts_at),
    status: row.status,
    competition: row.competition_name,
    season: row.season_label,
    round: row.round_label && /^\d+$/.test(row.round_label) ? Number(row.round_label) : null,
    roundLabel: row.round_label,
    home: {
      id: 0,
      name: row.home_name,
      shortName: row.home_short_name,
      code: row.home_code,
      imageUrl: row.home_badge_url,
    },
    away: {
      id: 0,
      name: row.away_name,
      shortName: row.away_short_name,
      code: row.away_code,
      imageUrl: row.away_badge_url,
    },
    homeScore: row.home_score === null ? null : Number(row.home_score),
    awayScore: row.away_score === null ? null : Number(row.away_score),
    venue: row.venue,
    reportUrl: row.match_report_url,
    featured: Boolean(row.is_featured),
    published: Boolean(row.is_published),
    manualLock: Boolean(row.manual_lock),
    sourceName: row.source_name,
  };
}

function mapStanding(row: StandingRow): SportsStanding {
  return {
    key: row.record_key,
    season: row.season_label,
    sourceName: row.source_name,
    position: Number(row.position_number),
    teamId: Number(row.external_team_id) || Number(row.standing_id),
    team: row.club_name,
    shortName: row.club_short_name,
    played: Number(row.played),
    won: Number(row.won),
    drawn: Number(row.drawn),
    lost: Number(row.lost),
    goalsFor: Number(row.goals_for),
    goalsAgainst: Number(row.goals_against),
    goalDifference: Number(row.goals_for) - Number(row.goals_against),
    points: Number(row.points),
    zone: row.zone_label,
    imageUrl: row.club_badge_url,
    published: Boolean(row.is_published),
    manualLock: Boolean(row.manual_lock),
  };
}

export async function listClubTeams(includeUnpublished = false): Promise<ClubTeam[]> {
  if (!isDatabaseConfigured()) return fallbackTeams.filter((team) => includeUnpublished || team.published);
  try {
    await ensureCmsSchema();
    const [rows] = await getDatabasePool().query<TeamRow[]>(
      `SELECT * FROM sports_teams ${includeUnpublished ? "" : "WHERE is_published = TRUE"}
       ORDER BY is_primary DESC, sort_order ASC, name ASC`,
    );
    return rows.map(mapTeam);
  } catch (error) {
    console.error("[SPORTS] Lecture des équipes impossible", error);
    return fallbackTeams.filter((team) => includeUnpublished || team.published);
  }
}

export async function getClubTeam(slug: string, includeUnpublished = false) {
  const teams = await listClubTeams(includeUnpublished);
  return teams.find((team) => team.slug === slug) || null;
}

async function readStoredSports(teamId: number, includeUnpublished = false) {
  await ensureCmsSchema();
  const pool = getDatabasePool();
  const matchVisibility = includeUnpublished ? "" : "AND is_published = TRUE";
  const standingVisibility = includeUnpublished ? "" : "AND is_published = TRUE";
  const [matchRows, standingRows] = await Promise.all([
    pool.query<MatchRow[]>(
      `SELECT * FROM sports_matches WHERE team_id = ? ${matchVisibility} ORDER BY starts_at ASC, sort_order ASC`,
      [teamId],
    ),
    pool.query<StandingRow[]>(
      `SELECT * FROM sports_standings WHERE team_id = ? ${standingVisibility}
       ORDER BY season_label DESC, position_number ASC`,
      [teamId],
    ),
  ]);
  return {
    matches: matchRows[0].map(mapMatch),
    standings: standingRows[0].map(mapStanding),
  };
}

function fromPublicMatch(match: MatchSummary, sourceName: SportsMatch["sourceName"]): SportsMatch {
  return {
    ...match,
    key: `${sourceName}:${match.id}`,
    sourceName,
    roundLabel: match.round === null ? null : String(match.round),
    reportUrl: null,
    featured: false,
    published: true,
    manualLock: false,
  };
}

function fromPublicStanding(row: StandingSummary, season: string, sourceName: SportsStanding["sourceName"]): SportsStanding {
  return {
    ...row,
    key: `${sourceName}:${season}:${row.teamId}`,
    season,
    sourceName,
    goalsFor: 0,
    goalsAgainst: Math.max(0, -row.goalDifference),
    published: true,
    manualLock: false,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "UTS-Site/2.0" },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 300, tags: ["uts-sports-hub"] },
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json() as Promise<T>;
}

function sofaTeam(team: SofaTeam): TeamSummarySmall {
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName || team.name,
    code: team.nameCode || codeFor(team.name),
    imageUrl: `https://img.sofascore.com/api/v1/team/${team.id}/image`,
  };
}

function sofaMatch(event: SofaEvent): SportsMatch {
  const finished = event.status.type === "finished";
  return {
    id: event.id,
    key: `sofascore:${event.id}`,
    timestamp: event.startTimestamp,
    status: finished ? "finished" : "scheduled",
    competition: event.tournament?.name || "Compétition",
    season: event.season?.name || "Saison en cours",
    round: event.roundInfo?.round ?? null,
    roundLabel: event.roundInfo?.round ? String(event.roundInfo.round) : null,
    home: sofaTeam(event.homeTeam),
    away: sofaTeam(event.awayTeam),
    homeScore: event.homeScore?.current ?? event.homeScore?.display ?? null,
    awayScore: event.awayScore?.current ?? event.awayScore?.display ?? null,
    venue: event.venue?.stadium?.name || event.venue?.city?.name || null,
    reportUrl: null,
    featured: false,
    published: true,
    manualLock: false,
    sourceName: "sofascore",
  };
}

async function fetchSofascoreData(team: ClubTeam) {
  if (!team.apiTeamId) return { matches: [] as SportsMatch[], standings: [] as SportsStanding[], season: "Saison en cours" };
  const [next, last] = await Promise.all([
    fetchJson<{ events?: SofaEvent[] }>(`${SOFASCORE_API}/team/${team.apiTeamId}/events/next/0`),
    fetchJson<{ events?: SofaEvent[] }>(`${SOFASCORE_API}/team/${team.apiTeamId}/events/last/0`),
  ]);
  const events = [...(next.events || []), ...(last.events || [])];
  const unique = new Map(events.map((event) => [event.id, event]));
  const firstEvent = [...unique.values()][0];
  const seasonName = firstEvent?.season?.name || "Saison en cours";
  let standings: SportsStanding[] = [];

  if (team.apiTournamentId && firstEvent?.season?.id) {
    const response = await fetchJson<{ standings?: { rows?: SofaStanding[] }[] }>(
      `${SOFASCORE_API}/unique-tournament/${team.apiTournamentId}/season/${firstEvent.season.id}/standings/total`,
    );
    standings = (response.standings?.[0]?.rows || []).map((row) => ({
      key: `sofascore:${firstEvent.season?.id}:${row.team.id}`,
      season: seasonName,
      sourceName: "sofascore",
      position: row.position,
      teamId: row.team.id,
      team: row.team.name,
      shortName: row.team.shortName || row.team.name,
      played: row.matches,
      won: row.wins,
      drawn: row.draws,
      lost: row.losses,
      goalsFor: row.scoresFor,
      goalsAgainst: row.scoresAgainst,
      goalDifference: row.scoresFor - row.scoresAgainst,
      points: row.points,
      zone: row.promotion?.text || null,
      imageUrl: `https://img.sofascore.com/api/v1/team/${row.team.id}/image`,
      published: true,
      manualLock: false,
    }));
  }

  return { matches: [...unique.values()].map(sofaMatch), standings, season: seasonName };
}

function sportsDbMatch(event: SportsDbEvent): SportsMatch | null {
  const homeName = event.strHomeTeam?.trim();
  const awayName = event.strAwayTeam?.trim();
  const dateTime = event.strTimestamp || (event.dateEvent ? `${event.dateEvent}T${event.strTime || "00:00:00"}Z` : "");
  const timestamp = Date.parse(dateTime);
  if (!homeName || !awayName || !Number.isFinite(timestamp)) return null;
  const number = (value?: string | number | null) => value === null || value === undefined || value === "" ? null : Number(value);
  const homeScore = number(event.intHomeScore);
  const awayScore = number(event.intAwayScore);
  const id = Number(event.idEvent) || Math.floor(timestamp / 1000);
  return {
    id,
    key: `thesportsdb:${event.idEvent || id}`,
    timestamp: Math.floor(timestamp / 1000),
    status: homeScore !== null && awayScore !== null ? "finished" : "scheduled",
    competition: event.strLeague || "Compétition",
    season: event.strSeason || "Saison en cours",
    round: number(event.intRound),
    roundLabel: event.intRound ? String(event.intRound) : null,
    home: { id: Number(event.idHomeTeam) || 0, name: homeName, shortName: homeName, code: codeFor(homeName), imageUrl: event.strHomeTeamBadge || null },
    away: { id: Number(event.idAwayTeam) || 0, name: awayName, shortName: awayName, code: codeFor(awayName), imageUrl: event.strAwayTeamBadge || null },
    homeScore,
    awayScore,
    venue: event.strVenue || null,
    reportUrl: null,
    featured: false,
    published: true,
    manualLock: false,
    sourceName: "thesportsdb",
  };
}

async function fetchSportsDbData(team: ClubTeam) {
  if (!team.apiTeamId) return { matches: [] as SportsMatch[], standings: [] as SportsStanding[], season: "Saison en cours" };
  const [next, last] = await Promise.all([
    fetchJson<{ events?: SportsDbEvent[] | null }>(`${SPORTSDB_API}/eventsnext.php?id=${team.apiTeamId}`),
    fetchJson<{ results?: SportsDbEvent[] | null }>(`${SPORTSDB_API}/eventslast.php?id=${team.apiTeamId}`),
  ]);
  const matches = [...(next.events || []), ...(last.results || [])]
    .map(sportsDbMatch)
    .filter((match): match is SportsMatch => match !== null);
  return { matches, standings: [] as SportsStanding[], season: matches[0]?.season || "Saison en cours" };
}

async function fetchProviderData(team: ClubTeam) {
  if (team.apiProvider === "sofascore") return fetchSofascoreData(team);
  if (team.apiProvider === "thesportsdb") return fetchSportsDbData(team);
  return { matches: [] as SportsMatch[], standings: [] as SportsStanding[], season: "Saison en cours" };
}

function mergeMatches(stored: SportsMatch[], live: SportsMatch[]) {
  const merged = new Map(live.map((match) => [match.key, match]));
  for (const match of stored) merged.set(match.key, match);
  return [...merged.values()].filter((match) => match.published).sort((a, b) => a.timestamp - b.timestamp);
}

function mergeStandings(stored: SportsStanding[], live: SportsStanding[]) {
  if (!stored.length) return live;
  const merged = new Map(live.map((row) => [row.key, row]));
  for (const row of stored) merged.set(row.key, row);
  return [...merged.values()].filter((row) => row.published).sort((a, b) => a.position - b.position);
}

export async function getTeamSportsData(slug: string): Promise<TeamSportsData | null> {
  const team = await getClubTeam(slug);
  if (!team) return null;
  let stored = { matches: [] as SportsMatch[], standings: [] as SportsStanding[] };
  if (isDatabaseConfigured()) {
    try {
      stored = await readStoredSports(team.id);
    } catch (error) {
      console.error(`[SPORTS] Lecture impossible pour ${team.slug}`, error);
    }
  }

  let live = { matches: [] as SportsMatch[], standings: [] as SportsStanding[], season: "Saison en cours" };
  try {
    if (team.primary && team.apiTeamId === String(PRIMARY_TEAM_ID)) {
      const data = await getPublicUtsData();
      live = {
        matches: [...data.upcomingMatches, ...data.recentMatches].map((match) => fromPublicMatch(match, "sofascore")),
        standings: data.standings.map((row) => fromPublicStanding(row, data.standingsSeason, "sofascore")),
        season: data.standingsSeason,
      };
    } else {
      live = await fetchProviderData(team);
    }
  } catch (error) {
    console.error(`[SPORTS] Synchronisation publique impossible pour ${team.slug}`, error);
  }

  const matches = mergeMatches(stored.matches, live.matches);
  const standings = mergeStandings(stored.standings, live.standings);
  const now = Math.floor(Date.now() / 1000);
  return {
    team,
    upcomingMatches: matches.filter((match) => ["scheduled", "live", "postponed"].includes(match.status) && match.timestamp >= now - 86400),
    recentMatches: matches.filter((match) => match.status === "finished" || match.timestamp < now - 86400).sort((a, b) => b.timestamp - a.timestamp),
    standings,
    season: standings[0]?.season || live.season,
    freshness: live.matches.length || live.standings.length ? "live" : stored.matches.length || stored.standings.length ? "stored" : team.apiProvider === "manual" ? "manual" : "unavailable",
  };
}

export async function getSportsAdminData(teamId?: number) {
  const teams = await listClubTeams(true);
  const activeTeam = teams.find((team) => team.id === teamId) || teams[0] || null;
  if (!activeTeam || !isDatabaseConfigured()) return { teams, activeTeam, matches: [], standings: [] };
  const stored = await readStoredSports(activeTeam.id, true);
  return { teams, activeTeam, ...stored };
}

export async function saveClubTeam(input: Omit<ClubTeam, "id"> & { id?: number }, adminId: number) {
  await ensureCmsSchema();
  const pool = getDatabasePool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (input.primary) await connection.execute("UPDATE sports_teams SET is_primary = FALSE");
    if (input.id) {
      await connection.execute(
        `UPDATE sports_teams SET slug = ?, name = ?, short_name = ?, category_label = ?, team_type = ?,
         description_text = ?, hero_image_url = ?, api_provider = ?, api_team_id = ?, api_tournament_id = ?,
         api_league_id = ?, is_primary = ?, is_published = ?, sort_order = ?, updated_by_admin_id = ? WHERE team_id = ?`,
        [input.slug, input.name, input.shortName, input.categoryLabel, input.type, input.description, input.heroImageUrl,
          input.apiProvider, input.apiTeamId, input.apiTournamentId, input.apiLeagueId, input.primary, input.published,
          input.sortOrder, adminId, input.id],
      );
    } else {
      await connection.execute(
        `INSERT INTO sports_teams (slug, name, short_name, category_label, team_type, description_text,
         hero_image_url, api_provider, api_team_id, api_tournament_id, api_league_id, is_primary,
         is_published, sort_order, updated_by_admin_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [input.slug, input.name, input.shortName, input.categoryLabel, input.type, input.description, input.heroImageUrl,
          input.apiProvider, input.apiTeamId, input.apiTournamentId, input.apiLeagueId, input.primary, input.published,
          input.sortOrder, adminId],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function saveSportsMatch(input: {
  key?: string;
  teamId: number;
  startsAt: string;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled";
  competition: string;
  season: string;
  roundLabel: string | null;
  homeName: string;
  homeShortName: string;
  homeCode: string;
  homeBadgeUrl: string | null;
  awayName: string;
  awayShortName: string;
  awayCode: string;
  awayBadgeUrl: string | null;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  reportUrl: string | null;
  featured: boolean;
  published: boolean;
}, adminId: number) {
  await ensureCmsSchema();
  const key = input.key || `dashboard:${randomUUID()}`;
  await getDatabasePool().execute(
    `INSERT INTO sports_matches (record_key, team_id, source_name, starts_at, status, competition_name,
     season_label, round_label, home_name, home_short_name, home_code, home_badge_url, away_name,
     away_short_name, away_code, away_badge_url, home_score, away_score, venue, match_report_url,
     is_featured, is_published, manual_lock, updated_by_admin_id)
     VALUES (?, ?, 'dashboard', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)
     ON DUPLICATE KEY UPDATE starts_at = VALUES(starts_at), status = VALUES(status), competition_name = VALUES(competition_name),
     season_label = VALUES(season_label), round_label = VALUES(round_label), home_name = VALUES(home_name),
     home_short_name = VALUES(home_short_name), home_code = VALUES(home_code), home_badge_url = VALUES(home_badge_url),
     away_name = VALUES(away_name), away_short_name = VALUES(away_short_name), away_code = VALUES(away_code),
     away_badge_url = VALUES(away_badge_url), home_score = VALUES(home_score), away_score = VALUES(away_score),
     venue = VALUES(venue), match_report_url = VALUES(match_report_url), is_featured = VALUES(is_featured),
     is_published = VALUES(is_published), manual_lock = TRUE, source_name = 'dashboard', updated_by_admin_id = VALUES(updated_by_admin_id)`,
    [key, input.teamId, input.startsAt, input.status, input.competition, input.season, input.roundLabel,
      input.homeName, input.homeShortName, input.homeCode, input.homeBadgeUrl, input.awayName, input.awayShortName,
      input.awayCode, input.awayBadgeUrl, input.homeScore, input.awayScore, input.venue, input.reportUrl,
      input.featured, input.published, adminId],
  );
}

export async function saveSportsStanding(input: {
  key?: string;
  teamId: number;
  season: string;
  position: number;
  clubName: string;
  clubShortName: string;
  clubBadgeUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  zone: string | null;
  published: boolean;
}, adminId: number) {
  await ensureCmsSchema();
  const key = input.key || `dashboard:${input.teamId}:${input.season}:${randomUUID()}`;
  await getDatabasePool().execute(
    `INSERT INTO sports_standings (record_key, team_id, season_label, source_name, position_number,
     club_name, club_short_name, club_badge_url, played, won, drawn, lost, goals_for, goals_against,
     points, zone_label, is_published, manual_lock, updated_by_admin_id)
     VALUES (?, ?, ?, 'dashboard', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)
     ON DUPLICATE KEY UPDATE season_label = VALUES(season_label), position_number = VALUES(position_number),
     club_name = VALUES(club_name), club_short_name = VALUES(club_short_name), club_badge_url = VALUES(club_badge_url),
     played = VALUES(played), won = VALUES(won), drawn = VALUES(drawn), lost = VALUES(lost), goals_for = VALUES(goals_for),
     goals_against = VALUES(goals_against), points = VALUES(points), zone_label = VALUES(zone_label),
     is_published = VALUES(is_published), manual_lock = TRUE, source_name = 'dashboard', updated_by_admin_id = VALUES(updated_by_admin_id)`,
    [key, input.teamId, input.season, input.position, input.clubName, input.clubShortName, input.clubBadgeUrl,
      input.played, input.won, input.drawn, input.lost, input.goalsFor, input.goalsAgainst, input.points,
      input.zone, input.published, adminId],
  );
}

async function persistProviderData(team: ClubTeam, matches: SportsMatch[], standings: SportsStanding[]) {
  const pool = getDatabasePool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const match of matches) {
      await connection.execute(
        `INSERT INTO sports_matches (record_key, team_id, external_id, source_name, starts_at, status,
         competition_name, season_label, round_label, home_name, home_short_name, home_code, home_badge_url,
         away_name, away_short_name, away_code, away_badge_url, home_score, away_score, venue, is_published)
         VALUES (?, ?, ?, ?, FROM_UNIXTIME(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE starts_at = IF(manual_lock, starts_at, VALUES(starts_at)),
         status = IF(manual_lock, status, VALUES(status)), competition_name = IF(manual_lock, competition_name, VALUES(competition_name)),
         season_label = IF(manual_lock, season_label, VALUES(season_label)), round_label = IF(manual_lock, round_label, VALUES(round_label)),
         home_name = IF(manual_lock, home_name, VALUES(home_name)), home_short_name = IF(manual_lock, home_short_name, VALUES(home_short_name)),
         home_code = IF(manual_lock, home_code, VALUES(home_code)), home_badge_url = IF(manual_lock, home_badge_url, VALUES(home_badge_url)),
         away_name = IF(manual_lock, away_name, VALUES(away_name)), away_short_name = IF(manual_lock, away_short_name, VALUES(away_short_name)),
         away_code = IF(manual_lock, away_code, VALUES(away_code)), away_badge_url = IF(manual_lock, away_badge_url, VALUES(away_badge_url)),
         home_score = IF(manual_lock, home_score, VALUES(home_score)), away_score = IF(manual_lock, away_score, VALUES(away_score)),
         venue = IF(manual_lock, venue, VALUES(venue))`,
        [match.key, team.id, String(match.id), match.sourceName, match.timestamp, match.status, match.competition,
          match.season.slice(0, 20), match.roundLabel, match.home.name, match.home.shortName, match.home.code,
          match.home.imageUrl, match.away.name, match.away.shortName, match.away.code, match.away.imageUrl,
          match.homeScore, match.awayScore, match.venue],
      );
    }
    for (const row of standings) {
      await connection.execute(
        `INSERT INTO sports_standings (record_key, team_id, season_label, source_name, external_team_id,
         position_number, club_name, club_short_name, club_badge_url, played, won, drawn, lost, goals_for,
         goals_against, points, zone_label, is_published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE position_number = IF(manual_lock, position_number, VALUES(position_number)),
         club_name = IF(manual_lock, club_name, VALUES(club_name)), club_short_name = IF(manual_lock, club_short_name, VALUES(club_short_name)),
         club_badge_url = IF(manual_lock, club_badge_url, VALUES(club_badge_url)), played = IF(manual_lock, played, VALUES(played)),
         won = IF(manual_lock, won, VALUES(won)), drawn = IF(manual_lock, drawn, VALUES(drawn)), lost = IF(manual_lock, lost, VALUES(lost)),
         goals_for = IF(manual_lock, goals_for, VALUES(goals_for)), goals_against = IF(manual_lock, goals_against, VALUES(goals_against)),
         points = IF(manual_lock, points, VALUES(points)), zone_label = IF(manual_lock, zone_label, VALUES(zone_label))`,
        [row.key, team.id, row.season.slice(0, 20), row.sourceName, String(row.teamId), row.position,
          row.team, row.shortName, row.imageUrl, row.played, row.won, row.drawn, row.lost, row.goalsFor,
          row.goalsAgainst, row.points, row.zone],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function syncClubTeam(teamId: number) {
  await ensureCmsSchema();
  const teams = await listClubTeams(true);
  const team = teams.find((item) => item.id === teamId);
  if (!team) throw new Error("Équipe introuvable");
  if (team.apiProvider === "manual") throw new Error("Aucun fournisseur API configuré");
  const pool = getDatabasePool();
  const [result] = await pool.execute<ResultSetHeader>(
    "INSERT INTO sports_sync_log (team_id, provider_name, status) VALUES (?, ?, 'running')",
    [team.id, team.apiProvider],
  );
  try {
    const data = team.primary && team.apiTeamId === String(PRIMARY_TEAM_ID)
      ? await getPublicUtsData().then((publicData) => ({
          matches: [...publicData.upcomingMatches, ...publicData.recentMatches].map((match) => fromPublicMatch(match, team.apiProvider as SportsMatch["sourceName"])),
          standings: publicData.standings.map((row) => fromPublicStanding(row, publicData.standingsSeason, team.apiProvider as SportsStanding["sourceName"])),
        }))
      : await fetchProviderData(team);
    await persistProviderData(team, data.matches, data.standings);
    await pool.execute(
      "UPDATE sports_sync_log SET status = 'completed', imported_matches = ?, imported_standings = ?, completed_at = UTC_TIMESTAMP() WHERE sync_id = ?",
      [data.matches.length, data.standings.length, result.insertId],
    );
    return { matches: data.matches.length, standings: data.standings.length };
  } catch (error) {
    await pool.execute(
      "UPDATE sports_sync_log SET status = 'failed', error_message = ?, completed_at = UTC_TIMESTAMP() WHERE sync_id = ?",
      [error instanceof Error ? error.message.slice(0, 1000) : "Erreur inconnue", result.insertId],
    );
    throw error;
  }
}

export async function deleteSportsRecord(kind: "match" | "standing", key: string) {
  await ensureCmsSchema();
  const table = kind === "match" ? "sports_matches" : "sports_standings";
  await getDatabasePool().execute(`DELETE FROM ${table} WHERE record_key = ?`, [key]);
}
