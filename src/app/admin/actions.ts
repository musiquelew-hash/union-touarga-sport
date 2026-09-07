"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  clearCmsCategory,
  cmsKinds,
  deleteCmsRecord,
  saveCmsSetting,
  type CmsKind,
  upsertCmsRecord,
} from "@/lib/relational-cms-db";
import {
  clearAdminSession,
  createAdminSession,
  isAdminAuthConfigured,
  requireAdmin,
  requireSuperAdmin,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import {
  AdminAccountError,
  adminRoles,
  changeAdminPassword,
  createAdminUser,
  deleteAdminUser,
  updateAdminUser,
} from "@/lib/admin-users";
import { runInitialContentImport } from "@/lib/initial-content-import";
import { ImageUploadError, resolveImageField } from "@/lib/media-assets";
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
const optionalLongText = z.string().trim().max(3000);
const imagePath = z.string().trim().min(1).max(1000).refine((value) => value.startsWith("/") || URL.canParse(value));
const optionalImagePath = optionalText.refine((value) => !value || value.startsWith("/") || URL.canParse(value));
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
  revalidatePath("/", "layout");
}

async function uploadedImages<const Name extends string>(
  formData: FormData,
  names: readonly Name[],
  adminUserId: number,
  destination: string,
) {
  try {
    const entries = await Promise.all(names.map(async (name) => (
      [name, await resolveImageField(formData, name, adminUserId)] as const
    )));
    return Object.fromEntries(entries) as Record<Name, string>;
  } catch (error) {
    if (error instanceof ImageUploadError) redirect(`${destination}?error=image-upload`);
    throw error;
  }
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
  if (!credentials.success) redirect("/admin/login?error=credentials");
  const admin = await verifyAdminCredentials(credentials.data.username, credentials.data.password);
  if (!admin) {
    redirect("/admin/login?error=credentials");
  }

  await createAdminSession(admin);
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
  crestColorUrl: imagePath,
  crestWhiteUrl: imagePath,
  adminLoginImageUrl: imagePath,
  homeHeroImageUrl: imagePath,
  homeHeroImageAlt: requiredText,
  homeManifestoImageUrl: imagePath,
  homeManifestoImageAlt: requiredText,
  teamHeaderImageUrl: imagePath,
  teamHeaderImageAlt: requiredText,
  matchesHeaderImageUrl: imagePath,
  matchesHeaderImageAlt: requiredText,
  standingsHeaderImageUrl: imagePath,
  standingsHeaderImageAlt: requiredText,
  clubHeaderImageUrl: imagePath,
  clubHeaderImageAlt: requiredText,
  mediaHeaderImageUrl: imagePath,
  mediaHeaderImageAlt: requiredText,
  mediaSocialImageUrl: imagePath,
  mediaSocialImageAlt: requiredText,
  mediaFallbackImageUrl: imagePath,
});

export async function saveSiteContentAction(formData: FormData) {
  const admin = await requireAdmin();
  const images = await uploadedImages(formData, [
    "crestColorUrl", "crestWhiteUrl", "adminLoginImageUrl", "homeHeroImageUrl",
    "homeManifestoImageUrl", "teamHeaderImageUrl", "matchesHeaderImageUrl",
    "standingsHeaderImageUrl", "clubHeaderImageUrl", "mediaHeaderImageUrl",
    "mediaSocialImageUrl", "mediaFallbackImageUrl",
  ] as const, admin.id, "/admin/contenu");
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
    crestColorUrl: images.crestColorUrl,
    crestWhiteUrl: images.crestWhiteUrl,
    adminLoginImageUrl: images.adminLoginImageUrl,
    homeHeroImageUrl: images.homeHeroImageUrl,
    homeHeroImageAlt: text(formData, "homeHeroImageAlt"),
    homeManifestoImageUrl: images.homeManifestoImageUrl,
    homeManifestoImageAlt: text(formData, "homeManifestoImageAlt"),
    teamHeaderImageUrl: images.teamHeaderImageUrl,
    teamHeaderImageAlt: text(formData, "teamHeaderImageAlt"),
    matchesHeaderImageUrl: images.matchesHeaderImageUrl,
    matchesHeaderImageAlt: text(formData, "matchesHeaderImageAlt"),
    standingsHeaderImageUrl: images.standingsHeaderImageUrl,
    standingsHeaderImageAlt: text(formData, "standingsHeaderImageAlt"),
    clubHeaderImageUrl: images.clubHeaderImageUrl,
    clubHeaderImageAlt: text(formData, "clubHeaderImageAlt"),
    mediaHeaderImageUrl: images.mediaHeaderImageUrl,
    mediaHeaderImageAlt: text(formData, "mediaHeaderImageAlt"),
    mediaSocialImageUrl: images.mediaSocialImageUrl,
    mediaSocialImageAlt: text(formData, "mediaSocialImageAlt"),
    mediaFallbackImageUrl: images.mediaFallbackImageUrl,
  };
  const parsed = siteContentSchema.safeParse(raw);
  if (!parsed.success) redirect("/admin/contenu?error=validation");

  return persist(async () => {
    await saveCmsSetting("site-content", parsed.data, admin.id);
    updateTag("site-content");
  }, "/admin/contenu");
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
  imageUrl: optionalImagePath,
  appearances: nullableInteger,
  goals: nullableInteger,
  assists: nullableInteger,
  rating: nullableNumber,
});

export async function savePlayerAction(formData: FormData) {
  const admin = await requireAdmin();
  const images = await uploadedImages(formData, ["imageUrl"] as const, admin.id, collectionRoutes.player);
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
    imageUrl: images.imageUrl,
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
      actorAdminId: admin.id,
    }),
    collectionRoutes.player,
  );
}

const staffSchema = z.object({
  id: z.number().int().positive(),
  name: requiredText,
  role: requiredText,
  department: z.enum(["Technique", "Médical", "Direction", "Autre"]),
  imageUrl: optionalImagePath,
});

export async function saveStaffAction(formData: FormData) {
  const admin = await requireAdmin();
  const images = await uploadedImages(formData, ["imageUrl"] as const, admin.id, collectionRoutes.staff);
  const parsed = staffSchema.safeParse({
    id: numberOr(formData, "id", generatedNumericId()),
    name: text(formData, "name"),
    role: text(formData, "role"),
    department: text(formData, "department"),
    imageUrl: images.imageUrl,
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
      actorAdminId: admin.id,
    }),
    collectionRoutes.staff,
  );
}

const newsSchema = z.object({
  id: z.number().int().positive(),
  title: requiredText,
  summary: optionalLongText,
  url: z.string().url(),
  imageUrl: optionalImagePath.transform((value) => value || null),
  imageAlt: optionalText,
  timestamp: nullableInteger,
});

export async function saveNewsAction(formData: FormData) {
  const admin = await requireAdmin();
  const images = await uploadedImages(formData, ["imageUrl"] as const, admin.id, collectionRoutes.news);
  const dateValue = text(formData, "dateTime");
  const parsed = newsSchema.safeParse({
    id: numberOr(formData, "id", generatedNumericId()),
    title: text(formData, "title"),
    summary: text(formData, "summary"),
    url: text(formData, "url"),
    imageUrl: images.imageUrl,
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
      actorAdminId: admin.id,
    }),
    collectionRoutes.news,
  );
}

const mediaSchema = z.object({
  id: requiredText,
  title: requiredText,
  url: z.string().url(),
  thumbnailUrl: optionalImagePath.transform((value) => value || null),
  timestamp: nullableInteger,
});

export async function saveMediaAction(formData: FormData) {
  const admin = await requireAdmin();
  const images = await uploadedImages(formData, ["thumbnailUrl"] as const, admin.id, collectionRoutes.media);
  const dateValue = text(formData, "dateTime");
  const key = recordKey(formData);
  const parsed = mediaSchema.safeParse({
    id: text(formData, "id") || key,
    title: text(formData, "title"),
    url: text(formData, "url"),
    thumbnailUrl: images.thumbnailUrl,
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
      actorAdminId: admin.id,
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

export async function runInitialContentImportAction() {
  const admin = await requireSuperAdmin();
  let result: Awaited<ReturnType<typeof runInitialContentImport>>;

  try {
    result = await runInitialContentImport(admin.id);
  } catch (error) {
    console.error("[ADMIN] Import initial impossible", error);
    redirect("/admin?error=initial-import");
  }

  if (result === "already-completed") redirect("/admin?error=import-completed");
  if (result === "running") redirect("/admin?error=import-running");
  publicPaths();
  redirect("/admin?saved=imported");
}

const adminAccountSchema = z.object({
  username: z.string().trim().min(3).max(100).regex(/^[a-zA-Z0-9._-]+$/),
  displayName: z.string().trim().min(2).max(160),
  role: z.enum(adminRoles),
  active: z.boolean(),
});

const createAdminSchema = adminAccountSchema.extend({
  password: z.string().min(1).max(200),
});

const updateAdminSchema = adminAccountSchema.extend({
  id: z.number().int().positive(),
  password: z.string().max(200),
});

function adminAccountError(error: unknown): never {
  if (error instanceof AdminAccountError) {
    redirect(`/admin/administrateurs?error=${error.code}`);
  }
  console.error("[ADMIN] Gestion de compte impossible", error);
  redirect("/admin/administrateurs?error=database");
}

export async function createAdminAction(formData: FormData) {
  const actor = await requireSuperAdmin();
  const parsed = createAdminSchema.safeParse({
    username: text(formData, "username"),
    displayName: text(formData, "displayName"),
    password: text(formData, "password"),
    role: text(formData, "role"),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) redirect("/admin/administrateurs?error=validation");

  try {
    await createAdminUser(parsed.data, actor.id);
  } catch (error) {
    adminAccountError(error);
  }
  revalidatePath("/admin/administrateurs");
  redirect("/admin/administrateurs?saved=created");
}

export async function updateAdminAction(formData: FormData) {
  const actor = await requireSuperAdmin();
  const parsed = updateAdminSchema.safeParse({
    id: numberOr(formData, "id", 0),
    username: text(formData, "username"),
    displayName: text(formData, "displayName"),
    password: text(formData, "password"),
    role: text(formData, "role"),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) redirect("/admin/administrateurs?error=validation");

  try {
    await updateAdminUser(parsed.data.id, parsed.data, actor.id);
  } catch (error) {
    adminAccountError(error);
  }
  revalidatePath("/admin/administrateurs");
  redirect("/admin/administrateurs?saved=updated");
}

export async function deleteAdminAction(formData: FormData) {
  const actor = await requireSuperAdmin();
  const id = z.number().int().positive().safeParse(numberOr(formData, "id", 0));
  if (!id.success) redirect("/admin/administrateurs?error=validation");

  try {
    await deleteAdminUser(id.data, actor.id);
  } catch (error) {
    adminAccountError(error);
  }
  revalidatePath("/admin/administrateurs");
  redirect("/admin/administrateurs?saved=deleted");
}

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z.string().min(1).max(200),
    confirmPassword: z.string().min(1).max(200),
  })
  .refine((data) => data.newPassword === data.confirmPassword);

export async function changeOwnPasswordAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: text(formData, "currentPassword"),
    newPassword: text(formData, "newPassword"),
    confirmPassword: text(formData, "confirmPassword"),
  });
  if (!parsed.success) redirect("/admin/compte?error=validation");

  const changed = await changeAdminPassword(admin.id, parsed.data.currentPassword, parsed.data.newPassword);
  if (!changed) redirect("/admin/compte?error=current-password");
  await clearAdminSession();
  redirect("/admin/login?passwordChanged=1");
}