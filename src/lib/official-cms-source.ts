import { decode } from "html-entities";
import { load } from "cheerio";
import type { MediaSummary, NewsSummary, PlayerSummary, StaffSummary } from "@/lib/uts-data";

const OFFICIAL_API = "https://touargaclub.ma/wp-json/wp/v2";
const OFFICIAL_TEAM_PAGE_ID = 4523;

type OfficialTeamPage = {
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

export type OfficialCmsSeedData = {
  players: PlayerSummary[];
  staff: StaffSummary[];
  news: NewsSummary[];
  media: MediaSummary[];
};

async function fetchOfficial<T>(path: string): Promise<T> {
  const response = await fetch(`${OFFICIAL_API}${path}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "UTS-Site/1.0",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Site officiel UTS ${response.status}: ${path}`);
  }

  return response.json() as Promise<T>;
}

function normalizeLookup(value: string) {
  return decode(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanOfficialName(value: string) {
  const normalized = decode(value)
    .replace(/^coach[_\s-]+/i, "")
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

function stableNumericId(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash || 1;
}

function imageSource(attributes: Record<string, string | undefined>) {
  return attributes["data-lazy-src"] || attributes["data-src"] || attributes.src || "";
}

function parseOfficialTeamPage(html: string) {
  const $ = load(html);
  const positionHeadings = new Map<string, PlayerSummary["position"]>([
    ["gardiens", "Gardien"],
    ["defenseurs", "Défenseur"],
    ["milieux de terrain", "Milieu"],
    ["attaquants", "Attaquant"],
  ]);
  const players: PlayerSummary[] = [];
  const staff: StaffSummary[] = [];
  const seenPlayers = new Set<string>();
  const seenStaff = new Set<string>();
  let currentPosition: PlayerSummary["position"] | null = null;

  $("h4, img").each((_index, element) => {
    const node = $(element);

    if (node.is("h4")) {
      currentPosition = positionHeadings.get(normalizeLookup(node.text())) || null;
      return;
    }

    const rawName = node.attr("alt") || node.attr("title") || node.closest("[title]").attr("title") || "";
    const imageUrl = imageSource({
      "data-lazy-src": node.attr("data-lazy-src"),
      "data-src": node.attr("data-src"),
      src: node.attr("src"),
    });
    const sectionId = normalizeLookup(node.closest("section").attr("id") || "");
    const department: StaffSummary["department"] | null = sectionId.includes("stafftechnique")
      ? "Technique"
      : sectionId.includes("staffmed")
        ? "Médical"
        : null;
    const name = cleanOfficialName(rawName);
    const key = normalizeLookup(name);

    if (!name || !key || !imageUrl.startsWith("http")) return;

    if (department) {
      if (seenStaff.has(key)) return;
      seenStaff.add(key);
      staff.push({
        id: stableNumericId(`staff:${key}`),
        name,
        role: /^coach[\s_-]/i.test(rawName)
          ? "Entraîneur principal"
          : department === "Médical"
            ? "Staff médical"
            : "Staff technique",
        department,
        imageUrl,
      });
      return;
    }

    if (!currentPosition || seenPlayers.has(key)) return;
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

  return { players, staff };
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
    });
}

function normalizeMedia(posts: OfficialPost[]) {
  return posts
    .map((post): MediaSummary | null => {
      const featuredMedia = post._embedded?.["wp:featuredmedia"]?.[0];
      const thumbnailUrl = featuredMedia?.source_url || post.jetpack_featured_media_url || null;

      if (!post.title?.rendered || !post.link || !thumbnailUrl) return null;

      return {
        id: `official-${post.id}`,
        title: decode(post.title.rendered),
        url: post.link,
        thumbnailUrl,
        timestamp: post.date ? Math.floor(new Date(post.date).getTime() / 1000) : null,
      };
    })
    .filter((item): item is MediaSummary => item !== null)
    .slice(0, 8);
}

export async function getOfficialCmsSeedData(): Promise<OfficialCmsSeedData> {
  const [teamPage, posts] = await Promise.all([
    fetchOfficial<OfficialTeamPage>(`/pages/${OFFICIAL_TEAM_PAGE_ID}?context=view`),
    fetchOfficial<OfficialPost[]>("/posts?per_page=12&_embed=1"),
  ]);
  const team = parseOfficialTeamPage(teamPage.content?.rendered || "");

  return {
    ...team,
    news: normalizeNews(posts),
    media: normalizeMedia(posts),
  };
}
