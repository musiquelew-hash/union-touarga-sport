"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireSuperAdmin } from "@/lib/admin-auth";
import {
  AcademyError,
  academyCategories,
  createAcademyGroup,
  createCoach,
  createGuardianApplication,
  createIndependentPlayerApplication,
  createPlayerForGuardian,
  createPlayerNote,
  createTrainingSession,
  enrollmentStatuses,
  ageOnDate,
  saveSessionAttendance,
  updateEnrollment,
} from "@/lib/academy";
import {
  authenticateAcademyAccount,
  clearAcademySession,
  createAcademySession,
  requireAcademyAccount,
} from "@/lib/academy-auth";
import { deleteUploadedImage, ImageUploadError, saveUploadedImage } from "@/lib/media-assets";

const required = z.string().trim().min(1).max(500);
const email = z.string().trim().toLowerCase().email().max(255);
const username = z.string().trim().toLowerCase().min(3).max(100).regex(/^[a-z0-9._-]+$/);
const password = z.string().min(1).max(200);
const phone = z.string().trim().min(8).max(32);
const youtubeUrl = z.string().trim().max(500).refine((value) => {
  if (!value) return true;
  try {
    const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "youtu.be";
  } catch {
    return false;
  }
});

const playerApplicationSchema = z.object({
  relationship: required, firstName: required, lastName: required, birthDate: z.iso.date(),
  gender: z.enum(["male", "female"]), nationality: required, birthPlace: z.string().trim().max(160),
  schoolName: z.string().trim().max(255), schoolLevel: z.string().trim().max(120),
  preferredFoot: z.enum(["right", "left", "both", "unknown"]), medicalNotes: z.string().trim().max(3000),
  videoUrl: youtubeUrl, consentMedical: z.literal(true), consentImage: z.boolean(),
});

function text(data: FormData, key: string) {
  return String(data.get(key) || "").trim();
}

function playerApplication(data: FormData, prefix = "") {
  return playerApplicationSchema.safeParse({
    relationship: text(data, `${prefix}relationship`), firstName: text(data, `${prefix}firstName`),
    lastName: text(data, `${prefix}lastName`), birthDate: text(data, `${prefix}birthDate`),
    gender: text(data, `${prefix}gender`), nationality: text(data, `${prefix}nationality`),
    birthPlace: text(data, `${prefix}birthPlace`), schoolName: text(data, `${prefix}schoolName`),
    schoolLevel: text(data, `${prefix}schoolLevel`), preferredFoot: text(data, `${prefix}preferredFoot`),
    medicalNotes: text(data, `${prefix}medicalNotes`), videoUrl: text(data, `${prefix}videoUrl`),
    consentMedical: data.get(`${prefix}consentMedical`) === "on",
    consentImage: data.get(`${prefix}consentImage`) === "on",
  });
}

async function identityDocument(data: FormData) {
  const file = data.get("identityDocument");
  if (!(file instanceof File) || file.size <= 0 || file.size > 8 * 1024 * 1024) throw new AcademyError("identity-document");
  const bytes = Buffer.from(await file.arrayBuffer());
  const isPdf = bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const mimeType = isPdf ? "application/pdf" : isJpeg ? "image/jpeg" : isPng ? "image/png" : null;
  if (!mimeType) throw new AcademyError("identity-document");
  return { name: file.name.slice(0, 255) || "piece-identite", mimeType, bytes };
}

function academyError(error: unknown, destination: string): never {
  if (error instanceof ImageUploadError) redirect(`${destination}?error=image-upload`);
  if (error instanceof AcademyError) redirect(`${destination}?error=${error.code}`);
  console.error("[ACADEMY] Opération impossible", error);
  redirect(`${destination}?error=database`);
}

async function cleanupUploadedPhoto(photoUrl: string) {
  if (!photoUrl.startsWith("/api/media-assets/")) return;
  try {
    await deleteUploadedImage(photoUrl);
  } catch (error) {
    console.error("[ACADEMY] Nettoyage de l’image orpheline impossible", photoUrl, error);
  }
}

export async function registerAcademyPlayerAction(formData: FormData) {
  const destination = "/academie/inscription";
  const account = z.object({ registrationType: z.enum(["guardian", "adult"]), username, email, phone, password }).safeParse({
    registrationType: text(formData, "registrationType"), username: text(formData, "username"),
    email: text(formData, "email"), phone: text(formData, "phone"), password: text(formData, "password"),
  });
  const player = playerApplication(formData);
  if (!account.success || !player.success) redirect(`${destination}?error=validation`);

  const age = ageOnDate(player.data.birthDate);
  if (age < 0 || age > 21 || (account.data.registrationType === "adult" ? age < 18 : age >= 18)) redirect(`${destination}?error=age-policy`);

  const guardian = z.object({ guardianName: required, address: required, city: required, emergencyPhone: phone }).safeParse({
    guardianName: text(formData, "guardianName"), address: text(formData, "address"),
    city: text(formData, "city"), emergencyPhone: text(formData, "emergencyPhone"),
  });
  const additionalCount = Math.min(Math.max(Number(text(formData, "additionalCount")) || 0, 0), 4);
  const additionalPlayers = Array.from({ length: additionalCount }, (_, index) => playerApplication(formData, `additional-${index}-`));
  if (account.data.registrationType === "guardian" && (!guardian.success || additionalPlayers.some((entry) => !entry.success))) redirect(`${destination}?error=validation`);
  if (additionalPlayers.some((entry) => entry.success && ageOnDate(entry.data.birthDate) >= 18)) redirect(`${destination}?error=age-policy`);

  const photoUrls: string[] = [];
  try {
    const savePhoto = async (fieldName: string) => {
      const photo = formData.get(fieldName);
      const photoUrl = photo instanceof File && photo.size > 0 ? await saveUploadedImage(photo, null) : "/uts/crest-color.png";
      photoUrls.push(photoUrl);
      return photoUrl;
    };
    const primaryPhotoUrl = await savePhoto("photo");
    if (account.data.registrationType === "adult") {
      await createIndependentPlayerApplication({ ...account.data, identityDocument: await identityDocument(formData),
        player: { ...player.data, photoUrl: primaryPhotoUrl } });
    } else if (guardian.success) {
      const completedAdditional = [];
      for (let index = 0; index < additionalPlayers.length; index += 1) {
        const entry = additionalPlayers[index];
        if (entry.success) completedAdditional.push({ ...entry.data, photoUrl: await savePhoto(`additional-${index}-photo`) });
      }
      await createGuardianApplication({ ...account.data, ...guardian.data,
        player: { ...player.data, photoUrl: primaryPhotoUrl }, additionalPlayers: completedAdditional });
    }
  } catch (error) {
    await Promise.all(photoUrls.map(cleanupUploadedPhoto));
    academyError(error, destination);
  }

  const authenticated = await authenticateAcademyAccount(account.data.username, account.data.password);
  if (authenticated) await createAcademySession(authenticated);
  redirect(`/academie/espace?registered=${account.data.registrationType}`);
}

export async function academyLoginAction(formData: FormData) {
  const parsed = z.object({ identifier: required, password: z.string().min(1).max(200) }).safeParse({
    identifier: text(formData, "identifier"), password: text(formData, "password"),
  });
  if (!parsed.success) redirect("/academie/connexion?error=credentials");
  const account = await authenticateAcademyAccount(parsed.data.identifier, parsed.data.password);
  if (!account) redirect("/academie/connexion?error=credentials");
  await createAcademySession(account);
  redirect("/academie/espace");
}

export async function academyLogoutAction() {
  await clearAcademySession();
  redirect("/academie/connexion");
}

export async function createCoachAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const parsed = z.object({ username, email, name: required, phone, password, licenseLevel: z.string().trim().max(100), specialty: z.string().trim().max(160) }).safeParse({
    username: text(formData, "username"), email: text(formData, "email"), name: text(formData, "name"), phone: text(formData, "phone"), password: text(formData, "password"),
    licenseLevel: text(formData, "licenseLevel"), specialty: text(formData, "specialty"),
  });
  if (!parsed.success) redirect("/admin/academie?error=validation");
  try { await createCoach(parsed.data, admin.id); } catch (error) { academyError(error, "/admin/academie"); }
  revalidatePath("/admin/academie");
  redirect("/admin/academie?saved=coach");
}

export async function createAcademyGroupAction(formData: FormData) {
  const admin = await requireAdmin();
  const coachValue = text(formData, "coachId");
  const parsed = z.object({ category: z.enum(academyCategories), name: required, season: z.string().regex(/^\d{4}\/\d{4}$/),
    capacity: z.coerce.number().int().min(8).max(40), venue: required, coachId: z.number().int().positive().nullable() }).safeParse({
    category: text(formData, "category"), name: text(formData, "name"), season: text(formData, "season"),
    capacity: text(formData, "capacity"), venue: text(formData, "venue"), coachId: coachValue ? Number(coachValue) : null,
  });
  if (!parsed.success) redirect("/admin/academie?error=validation");
  try { await createAcademyGroup(parsed.data, admin.id); } catch (error) { academyError(error, "/admin/academie"); }
  revalidatePath("/admin/academie");
  redirect("/admin/academie?saved=group");
}

export async function updateEnrollmentAction(formData: FormData) {
  const admin = await requireAdmin();
  const groupValue = text(formData, "groupId");
  const parsed = z.object({ enrollmentId: z.coerce.number().int().positive(), status: z.enum(enrollmentStatuses), groupId: z.number().int().positive().nullable() }).safeParse({
    enrollmentId: text(formData, "enrollmentId"), status: text(formData, "status"), groupId: groupValue ? Number(groupValue) : null,
  });
  if (!parsed.success) redirect("/admin/academie?error=validation");
  try { await updateEnrollment(parsed.data, admin.id); } catch (error) { academyError(error, "/admin/academie"); }
  revalidatePath("/admin/academie");
  revalidatePath("/academie/espace");
  redirect("/admin/academie?saved=enrollment");
}

export async function createTrainingSessionAction(formData: FormData) {
  const account = await requireAcademyAccount("coach");
  const parsed = z.object({ groupId: z.coerce.number().int().positive(), startsAt: z.string().min(16), endsAt: z.string().min(16), venue: required, focus: required }).safeParse({
    groupId: text(formData, "groupId"), startsAt: text(formData, "startsAt"), endsAt: text(formData, "endsAt"), venue: text(formData, "venue"), focus: text(formData, "focus"),
  });
  if (!parsed.success || new Date(parsed.data.endsAt) <= new Date(parsed.data.startsAt)) redirect("/academie/espace?error=validation");
  try { await createTrainingSession(parsed.data, account.id); } catch (error) { academyError(error, "/academie/espace"); }
  revalidatePath("/academie/espace");
  redirect("/academie/espace?saved=session");
}

export async function createCoachNoteAction(formData: FormData) {
  const account = await requireAcademyAccount("coach");
  const parsed = z.object({ playerId: z.coerce.number().int().positive(), category: z.enum(["sport", "medical", "administrative", "behavior"]),
    visibility: z.enum(["staff_only", "guardian"]), note: z.string().trim().min(2).max(3000) }).safeParse({
    playerId: text(formData, "playerId"), category: text(formData, "category"), visibility: text(formData, "visibility"), note: text(formData, "note"),
  });
  if (!parsed.success) redirect("/academie/espace?error=validation");
  try { await createPlayerNote(parsed.data, { accountId: account.id }); } catch (error) { academyError(error, "/academie/espace"); }
  revalidatePath("/academie/espace");
  redirect("/academie/espace?saved=note");
}

export async function saveAttendanceAction(formData: FormData) {
  const account = await requireAcademyAccount("coach");
  const sessionId = Number(text(formData, "sessionId"));
  const entries = Array.from(formData.entries()).flatMap(([key, value]) => {
    const playerId = key.startsWith("attendance-") ? Number(key.slice("attendance-".length)) : 0;
    const status = String(value);
    return playerId > 0 && ["present", "late", "absent", "excused"].includes(status)
      ? [{ playerId, status: status as "present" | "late" | "absent" | "excused" }]
      : [];
  });
  if (!Number.isInteger(sessionId) || sessionId <= 0 || !entries.length) redirect("/academie/espace?error=validation");
  try { await saveSessionAttendance(sessionId, entries, account.id); } catch (error) { academyError(error, "/academie/espace"); }
  revalidatePath("/academie/espace");
  redirect("/academie/espace?saved=attendance");
}

export async function registerAdditionalPlayerAction(formData: FormData) {
  const account = await requireAcademyAccount("guardian");
  const destination = "/academie/espace";
  const parsed = z.object({ relationship: required, firstName: required, lastName: required, birthDate: z.iso.date(),
    gender: z.enum(["male", "female"]), nationality: required, schoolName: z.string().trim().max(255),
    preferredFoot: z.enum(["right", "left", "both", "unknown"]), medicalNotes: z.string().trim().max(3000),
    videoUrl: youtubeUrl, consentMedical: z.literal(true), consentImage: z.boolean() }).safeParse({
    relationship: text(formData, "relationship"), firstName: text(formData, "firstName"), lastName: text(formData, "lastName"),
    birthDate: text(formData, "birthDate"), gender: text(formData, "gender"), nationality: text(formData, "nationality"),
    schoolName: text(formData, "schoolName"), preferredFoot: text(formData, "preferredFoot"), videoUrl: text(formData, "videoUrl"),
    medicalNotes: text(formData, "medicalNotes"), consentMedical: formData.get("consentMedical") === "on",
    consentImage: formData.get("consentImage") === "on",
  });
  if (!parsed.success || ageOnDate(parsed.data.birthDate) >= 18) redirect(`${destination}?error=age-policy`);
  let photoUrl = "/uts/crest-color.png";
  try {
    const photo = formData.get("photo");
    if (photo instanceof File && photo.size > 0) photoUrl = await saveUploadedImage(photo, null);
    await createPlayerForGuardian({ ...parsed.data, accountId: account.id, photoUrl });
  } catch (error) {
    await cleanupUploadedPhoto(photoUrl);
    academyError(error, destination);
  }
  revalidatePath(destination);
  redirect(`${destination}?saved=player`);
}