"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  clearCmsCategory,
  cmsKinds,
  deleteCmsRecord,
  replaceCmsCategory,
  saveCmsSetting,
  type CmsKind,
  upsertCmsRecord,
} from "@/lib/cms-db";
import {
  clearAdminSession,
  createAdminSession,
  isAdminAuthConfigured,
  requireAdmin,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import { getOfficialCmsSeedData, type OfficialCmsSeedData } from "@/lib/official-cms-source";
import { defaultSiteContent, type SiteContent } from "@/lib/site-content";
import {
  type MediaSummary,
  type NewsSummary,
  type PlayerSummary,
  type StaffSummary,
} from "@/lib/uts-data";

const collectionRoutes: Record<CmsKind, string> = {
  player: "/admin/gestion/player",
  staff: "/admin/gestion/staff",
  news: "/admin/gestion/news",
  media: "/admin/gestion/media",
};

const requiredText = z.string().trim().min(1).max(500);
const optionalText = z.string().trim().max(1000);
const nullableNumber = z.number().finite().nullable();
const nullableInteger = z.number().int().nullable();

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function numberOrNull(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function numberOr(formData: FormData, key: string, fallback: number) {
  const value = numberOrNull(formData, key);
  return value === null ? fallback : value;
}

function recordKey(formData: FormData) {
  return text(formData, "recordKey") || randomUUID();
}

function generatedNumericId() {
  return Number.parseInt(randomUUID().replaceAll("-", "").slice(0, 12), 16);
}

function published(formData: FormData) {
  return formData.get("published") === "on";
}

function publicPaths() {
  ["/", "/equipe", "/matchs", "/classement", "/medias", "/club"].forEach((path) => revalidatePath(path));
}

async function persist(task: () => Promise<void>, destination: string) {
  let failed = false;
  try {
    await task();
  } catch (error) {
    failed = true;
    console.error("[ADMIN] Écriture impossible", error);
  }

  if (failed) redirect(`${destination}?error=database`);
  publicPaths();
  redirect(`${destination}?saved=1`);
}

export async function loginAction(formData: FormData) {
  const credentials = z
    .object({ username: z.string().trim().min(1).max(100), password: z.string().min(1).max(500) })
    .safeParse({ username: text(formData, "username"), password: text(formData, "password") });

  if (!isAdminAuthConfigured()) redirect("/admin/login?error=setup");
  if (!credentials.success || !verifyAdminCredentials(credentials.data.username, credentials.data.password)) {
    redirect("/admin/login?error=credentials");
  }

  await createAdminSession(credentials.data.username);
  redirect("/admin");
}

export async function logoutAction() {
  await requireAdmin();
  await clearAdminSession();
  redirect("/admin/login");
}

const siteContentSchema = z.object({
  stripPrimary: requiredText,
  stripSecondary: requiredText,
  heroKicker: requiredText,
  heroTitleTop: requiredText,
  heroTitleBottom: requiredText,
  heroLeadStrong: requiredText,
  heroLead: z.string().trim().min(1).max(2000),
  manifestoTitle: requiredText,
  manifestoCopy: z.string().trim().min(1).max(3000),
  clubIntroTitle: requiredText,
  clubIntroParagraphOne: z.string().trim().min(1).max(3000),
  clubIntroParagraphTwo: z.string().trim().min(1).max(3000),
  clubMilestones: z.array(
    z.object({ year: requiredText, title: requiredText, copy: z.string().trim().min(1).max(2000) }),
  ),
  clubVenueTitle: requiredText,
  clubVenueCopy: z.string().trim().min(1).max(3000),
  footerStatement: requiredText,
  instagramUrl: z.string().url(),
  youtubeUrl: z.string().url(),
});

export async function saveSiteContentAction(formData: FormData) {
  await requireAdmin();
  const raw: SiteContent = {
    stripPrimary: text(formData, "stripPrimary"),
    stripSecondary: text(formData, "stripSecondary"),
    heroKicker: text(formData, "heroKicker"),
    heroTitleTop: text(formData, "heroTitleTop"),
    heroTitleBottom: text(formData, "heroTitleBottom"),
    heroLeadStrong: text(formData, "heroLeadStrong"),
    heroLead: text(formData, "heroLead"),
    manifestoTitle: text(formData, "manifestoTitle"),
    manifestoCopy: text(formData, "manifestoCopy"),
    clubIntroTitle: text(formData, "clubIntroTitle"),
    clubIntroParagraphOne: text(formData, "clubIntroParagraphOne"),
    clubIntroParagraphTwo: text(formData, "clubIntroParagraphTwo"),
    clubMilestones: defaultSiteContent.clubMilestones.map((_milestone, index) => ({
      year: text(formData, `milestone${index}Year`),
      title: text(formData, `milestone${index}Title`),
      copy: text(formData, `milestone${index}Copy`),
    })),
    clubVenueTitle: text(formData, "clubVenueTitle"),
    clubVenueCopy: text(formData, "clubVenueCopy"),
    footerStatement: text(formData, "footerStatement"),
    instagramUrl: text(formData, "instagramUrl"),
    youtubeUrl: text(formData, "youtubeUrl"),
  };
  const parsed = siteContentSchema.safeParse(raw);
  if (!parsed.success) redirect("/admin/contenu?error=validation");

  return persist(() => saveCmsSetting("site-content", parsed.data), "/admin/contenu");
}

const playerSchema = z.object({
  id: z.number().int().positive(),
  name: requiredText,
  shortName: requiredText,
  number: optionalText.transform((value) => value || null),
  position: z.enum(["Gardien", "Défenseur", "Milieu", "Attaquant", "Joueur"]),
  age: nullableInteger,
  height: nullableInteger,
  foot: optionalText.transform((value) => value || null),
  nationality: requiredText,
  countryCode: optionalText.transform((value) => value || null),
  imageUrl: optionalText,
  appearances: nullableInteger,
  goals: nullableInteger,
  assists: nullableInteger,
  rating: nullableNumber,
});

export async function savePlayerAction(formData: FormData) {
  await requireAdmin();
  const parsed = playerSchema.safeParse({
    id: numberOr(formData, "id", generatedNumericId()),
    name: text(formData, "name"),
    shortName: text(formData, "shortName") || text(formData, "name"),
    number: text(formData, "number"),
    position: text(formData, "position"),
    age: numberOrNull(formData, "age"),
    height: numberOrNull(formData, "height"),
    foot: text(formData, "foot"),
    nationality: text(formData, "nationality") || "Maroc",
    countryCode: text(formData, "countryCode"),
    imageUrl: text(formData, "imageUrl"),
    appearances: numberOrNull(formData, "appearances"),
    goals: numberOrNull(formData, "goals"),
    assists: numberOrNull(formData, "assists"),
    rating: numberOrNull(formData, "rating"),
  });
  if (!parsed.success) redirect(`${collectionRoutes.player}?error=validation`);

  const key = recordKey(formData);
  return persist(
    () => upsertCmsRecord<PlayerSummary>({
      kind: "player",
      key,
      data: parsed.data,
      published: published(formData),
      sortOrder: numberOr(formData, "sortOrder", 0),
    }),
    collectionRoutes.player,
  );
}

const staffSchema = z.object({
  id: z.number().int().positive(),
  name: requiredText,
  role: requiredText,
  department: z.enum(["Technique", "Médical", "Direction", "Autre"]),
  imageUrl: optionalText,
});

export async function saveStaffAction(formData: FormData) {
  await requireAdmin();
  const parsed = staffSchema.safeParse({
    id: numberOr(formData, "id", generatedNumericId()),
    name: text(formData, "name"),
    role: text(formData, "role"),
    department: text(formData, "department"),
    imageUrl: text(formData, "imageUrl"),
  });
  if (!parsed.success) redirect(`${collectionRoutes.staff}?error=validation`);

  const key = recordKey(formData);
  return persist(
    () => upsertCmsRecord<StaffSummary>({
      kind: "staff",
      key,
      data: parsed.data,
      published: published(formData),
      sortOrder: numberOr(formData, "sortOrder", 0),
    }),
    collectionRoutes.staff,
  );
}

const newsSchema = z.object({
  id: z.number().int().positive(),
  title: requiredText,
  url: z.string().url(),
  imageUrl: optionalText.transform((value) => value || null),
  imageAlt: optionalText,
  timestamp: nullableInteger,
});

export async function saveNewsAction(formData: FormData) {
  await requireAdmin();
  const dateValue = text(formData, "dateTime");
  const parsed = newsSchema.safeParse({
    id: numberOr(formData, "id", generatedNumericId()),
    title: text(formData, "title"),
    url: text(formData, "url"),
    imageUrl: text(formData, "imageUrl"),
    imageAlt: text(formData, "imageAlt"),
    timestamp: dateValue ? Math.floor(Date.parse(`${dateValue}Z`) / 1000) : null,
  });
  if (!parsed.success) redirect(`${collectionRoutes.news}?error=validation`);

  const key = recordKey(formData);
  return persist(
    () => upsertCmsRecord<NewsSummary>({
      kind: "news",
      key,
      data: parsed.data,
      published: published(formData),
      sortOrder: numberOr(formData, "sortOrder", -(parsed.data.timestamp || 0)),
    }),
    collectionRoutes.news,
  );
}

const mediaSchema = z.object({
  id: requiredText,
  title: requiredText,
  url: z.string().url(),
  thumbnailUrl: optionalText.transform((value) => value || null),
  timestamp: nullableInteger,
});

export async function saveMediaAction(formData: FormData) {
  await requireAdmin();
  const dateValue = text(formData, "dateTime");
  const key = recordKey(formData);
  const parsed = mediaSchema.safeParse({
    id: text(formData, "id") || key,
    title: text(formData, "title"),
    url: text(formData, "url"),
    thumbnailUrl: text(formData, "thumbnailUrl"),
    timestamp: dateValue ? Math.floor(Date.parse(`${dateValue}Z`) / 1000) : null,
  });
  if (!parsed.success) redirect(`${collectionRoutes.media}?error=validation`);

  return persist(
    () => upsertCmsRecord<MediaSummary>({
      kind: "media",
      key,
      data: parsed.data,
      published: published(formData),
      sortOrder: numberOr(formData, "sortOrder", -(parsed.data.timestamp || 0)),
    }),
    collectionRoutes.media,
  );
}

export async function deleteRecordAction(formData: FormData) {
  await requireAdmin();
  const kind = z.enum(cmsKinds).safeParse(text(formData, "kind"));
  const key = z.string().trim().min(1).max(128).safeParse(text(formData, "recordKey"));
  if (!kind.success || !key.success) redirect("/admin?error=validation");

  return persist(() => deleteCmsRecord(kind.data, key.data), collectionRoutes[kind.data]);
}

export async function clearCollectionAction(formData: FormData) {
  await requireAdmin();
  const kind = z.enum(cmsKinds).safeParse(text(formData, "kind"));
  if (!kind.success) redirect("/admin?error=validation");

  return persist(() => clearCmsCategory(kind.data), collectionRoutes[kind.data]);
}

function recordsForKind(kind: CmsKind, data: OfficialCmsSeedData) {
  switch (kind) {
    case "player":
      return data.players.map((item, index) => ({ key: String(item.id), data: item, sortOrder: index }));
    case "staff":
      return data.staff.map((item, index) => ({ key: String(item.id), data: item, sortOrder: index }));
    case "news":
      return data.news.map((item, index) => ({ key: String(item.id), data: item, sortOrder: index }));
    case "media":
      return data.media.map((item, index) => ({ key: item.id, data: item, sortOrder: index }));
  }
}

export async function syncCollectionAction(formData: FormData) {
  await requireAdmin();
  const kind = z.enum(cmsKinds).safeParse(text(formData, "kind"));
  if (!kind.success) redirect("/admin?error=validation");

  return persist(async () => {
    const officialData = await getOfficialCmsSeedData();
    const records = recordsForKind(kind.data, officialData);
    await replaceCmsCategory<unknown>(kind.data, records);
  }, collectionRoutes[kind.data]);
}

export async function syncAllCollectionsAction() {
  await requireAdmin();
  return persist(async () => {
    const officialData = await getOfficialCmsSeedData();
    for (const kind of cmsKinds) {
      await replaceCmsCategory<unknown>(kind, recordsForKind(kind, officialData));
    }
  }, "/admin");
}