import "server-only";

import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { unstable_cache } from "next/cache";
import { ensureDatabaseSchema, getDatabasePool } from "@/lib/database";

export const academyCategories = ["U10", "U11", "U12", "U13", "U14", "U15", "U16", "U17", "U18", "U19", "U20", "U21"] as const;
export const enrollmentStatuses = ["submitted", "review", "trial", "accepted", "active", "suspended", "rejected", "left"] as const;
export type AcademyCategory = (typeof academyCategories)[number];
export type EnrollmentStatus = (typeof enrollmentStatuses)[number];

export type AcademyRegistrationSettings = {
  seasonLabel: string;
  pageTitle: string;
  introText: string;
  registrationQuestion: string;
  guardianModeLabel: string;
  adultModeLabel: string;
  guardianPolicyText: string;
  adultPolicyText: string;
  accountHelpText: string;
  eligibilityText: string;
  consentText: string;
  trustDataText: string;
  trustFamilyText: string;
};

export const enrollmentLabels: Record<EnrollmentStatus, string> = {
  submitted: "Candidature reçue",
  review: "Dossier à l’étude",
  trial: "Essai programmé",
  accepted: "Accepté",
  active: "Inscrit et actif",
  suspended: "Suspendu",
  rejected: "Non retenu",
  left: "A quitté l’académie",
};

export class AcademyError extends Error {
  constructor(public readonly code: "duplicate" | "not-found" | "forbidden" | "capacity" | "invalid-group" | "schedule-conflict" | "age-policy" | "identity-document") {
    super(code);
  }
}

export function currentSeason() {
  const now = new Date();
  const start = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `${start}/${start + 1}`;
}

export const defaultAcademyRegistrationSettings: AcademyRegistrationSettings = {
  seasonLabel: currentSeason(),
  pageTitle: "Inscription Académie U10–U21",
  introText: "Un dossier famille pour les mineurs, ou un compte personnel avec CIN pour les joueurs de 18 à 21 ans.",
  registrationQuestion: "Qui dépose la candidature ?",
  guardianModeLabel: "Parent ou tuteur",
  adultModeLabel: "Joueur de 18 à 21 ans",
  guardianPolicyText: "Pour tout joueur mineur, le compte et la candidature sont créés par son responsable légal.",
  adultPolicyText: "Le joueur majeur crée son propre compte. Une copie de sa CIN est obligatoire.",
  accountHelpText: "La connexion sera possible avec le nom d’utilisateur ou l’e-mail.",
  eligibilityText: "Les filles et les garçons peuvent candidater dans toutes les catégories U10 à U21.",
  consentText: "En transmettant ce dossier, vous certifiez l’exactitude des informations et acceptez leur traitement pour la candidature à l’Académie UTS.",
  trustDataText: "Données protégées",
  trustFamilyText: "Un compte pour toute la famille",
};

async function readAcademyRegistrationSettings(): Promise<AcademyRegistrationSettings> {
  await ensureDatabaseSchema();
  const [rows] = await getDatabasePool().query<(RowDataPacket & {
    season_label: string; page_title: string; intro_text: string; registration_question: string;
    guardian_mode_label: string; adult_mode_label: string; guardian_policy_text: string;
    adult_policy_text: string; account_help_text: string; eligibility_text: string;
    consent_text: string; trust_data_text: string; trust_family_text: string;
  })[]>("SELECT * FROM academy_settings WHERE settings_id = 1 LIMIT 1");
  const row = rows[0];
  if (!row) return defaultAcademyRegistrationSettings;
  return {
    seasonLabel: row.season_label, pageTitle: row.page_title, introText: row.intro_text,
    registrationQuestion: row.registration_question, guardianModeLabel: row.guardian_mode_label,
    adultModeLabel: row.adult_mode_label, guardianPolicyText: row.guardian_policy_text,
    adultPolicyText: row.adult_policy_text, accountHelpText: row.account_help_text,
    eligibilityText: row.eligibility_text, consentText: row.consent_text,
    trustDataText: row.trust_data_text, trustFamilyText: row.trust_family_text,
  };
}

export const getAcademyRegistrationSettings = unstable_cache(
  readAcademyRegistrationSettings,
  ["academy-registration-settings"],
  { revalidate: 300, tags: ["academy-registration-settings"] },
);

export async function updateAcademyRegistrationSettings(settings: AcademyRegistrationSettings, adminId: number) {
  await ensureDatabaseSchema();
  await getDatabasePool().execute(
    `UPDATE academy_settings SET season_label = ?, page_title = ?, intro_text = ?, registration_question = ?,
      guardian_mode_label = ?, adult_mode_label = ?, guardian_policy_text = ?, adult_policy_text = ?,
      account_help_text = ?, eligibility_text = ?, consent_text = ?, trust_data_text = ?, trust_family_text = ?,
      updated_by_admin_id = ? WHERE settings_id = 1`,
    [settings.seasonLabel, settings.pageTitle, settings.introText, settings.registrationQuestion,
      settings.guardianModeLabel, settings.adultModeLabel, settings.guardianPolicyText, settings.adultPolicyText,
      settings.accountHelpText, settings.eligibilityText, settings.consentText, settings.trustDataText,
      settings.trustFamilyText, adminId],
  );
}

export function categoryForBirthDate(birthDate: string, season = currentSeason()): AcademyCategory | null {
  const birthYear = Number(birthDate.slice(0, 4));
  const seasonEnd = Number(season.split("/")[1]);
  const age = ageOnDate(birthDate) === 21 ? 21 : seasonEnd - birthYear;
  return academyCategories.includes(`U${age}` as AcademyCategory) ? `U${age}` as AcademyCategory : null;
}

export function ageOnDate(birthDate: string, referenceDate = new Date()) {
  const [year, month, day] = birthDate.split("-").map(Number);
  if (!year || !month || !day) return -1;
  let age = referenceDate.getUTCFullYear() - year;
  const birthdayPassed = referenceDate.getUTCMonth() + 1 > month
    || (referenceDate.getUTCMonth() + 1 === month && referenceDate.getUTCDate() >= day);
  if (!birthdayPassed) age -= 1;
  return age;
}

export function isAdultAcademyApplicant(birthDate: string, referenceDate = new Date()) {
  return ageOnDate(birthDate, referenceDate) >= 18;
}

function safeAcademyPhotoUrl(value: string) {
  return /^\/api\/media-assets\/[0-9a-f-]{36}$/i.test(value) || value === "/uts/crest-color.png"
    ? value
    : "/uts/crest-color.png";
}

export type AcademyGroup = {
  id: number;
  category: AcademyCategory;
  name: string;
  season: string;
  capacity: number;
  venue: string;
  active: boolean;
  coachId: number | null;
  coachName: string | null;
  playerCount: number;
};

export type AcademyCoach = {
  id: number;
  accountId: number;
  name: string;
  email: string;
  phone: string;
  licenseLevel: string | null;
  specialty: string | null;
  active: boolean;
};

export type AcademyEnrollment = {
  id: number;
  playerId: number;
  playerName: string;
  registrationNumber: string;
  birthDate: string;
  category: AcademyCategory;
  status: EnrollmentStatus;
  season: string;
  photoUrl: string;
  groupId: number | null;
  groupName: string | null;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  medicalNotes: string | null;
  videoUrl: string | null;
  identityDocumentAvailable: boolean;
  submittedAt: string;
};

export type AcademySession = {
  id: number;
  groupId: number;
  groupName: string;
  category: AcademyCategory;
  coachName: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  focus: string;
  status: "planned" | "completed" | "cancelled";
};

type GroupRow = RowDataPacket & {
  group_id: number; age_category: AcademyCategory; group_name: string; season_label: string;
  capacity: number; default_venue: string; is_active: number; coach_id: number | null;
  coach_name: string | null; player_count: number;
};

function mapGroup(row: GroupRow): AcademyGroup {
  return { id: Number(row.group_id), category: row.age_category, name: row.group_name, season: row.season_label,
    capacity: Number(row.capacity), venue: row.default_venue, active: Boolean(row.is_active), coachId: row.coach_id ? Number(row.coach_id) : null,
    coachName: row.coach_name, playerCount: Number(row.player_count) };
}

export async function listAcademyGroups(activeOnly = false) {
  await ensureDatabaseSchema();
  const [rows] = await getDatabasePool().query<GroupRow[]>(
    `SELECT g.*, a.display_name AS coach_name,
      (SELECT COUNT(*) FROM academy_enrollments e WHERE e.group_id = g.group_id AND e.status = 'active') AS player_count
     FROM academy_groups g
     LEFT JOIN academy_coaches c ON c.coach_id = g.coach_id
     LEFT JOIN academy_accounts a ON a.account_id = c.account_id
     ${activeOnly ? "WHERE g.is_active = TRUE" : ""}
     ORDER BY g.season_label DESC, CAST(SUBSTRING(g.age_category, 2) AS UNSIGNED), g.group_name`,
  );
  return rows.map(mapGroup);
}

export async function listAcademyCoaches() {
  await ensureDatabaseSchema();
  const [rows] = await getDatabasePool().query<(RowDataPacket & {
    coach_id: number; account_id: number; display_name: string; email: string; phone: string;
    license_level: string | null; specialty: string | null; is_active: number;
  })[]>(
    `SELECT c.coach_id, c.account_id, a.display_name, a.email, a.phone, c.license_level, c.specialty, a.is_active
     FROM academy_coaches c JOIN academy_accounts a ON a.account_id = c.account_id
     ORDER BY a.is_active DESC, a.display_name`,
  );
  return rows.map((row) => ({ id: Number(row.coach_id), accountId: Number(row.account_id), name: row.display_name,
    email: row.email, phone: row.phone, licenseLevel: row.license_level, specialty: row.specialty, active: Boolean(row.is_active) }));
}

export async function listAcademyEnrollments() {
  await ensureDatabaseSchema();
  const [rows] = await getDatabasePool().query<(RowDataPacket & {
    enrollment_id: number; player_id: number; player_name: string; registration_number: string; birth_date: Date | string;
    requested_category: AcademyCategory; status: EnrollmentStatus; season_label: string; photo_url: string;
    group_id: number | null; group_name: string | null; guardian_name: string; guardian_email: string;
    guardian_phone: string; medical_notes: string | null; video_url: string | null;
    identity_document_available: number; submitted_at: Date | string;
  })[]>(
    `SELECT e.enrollment_id, p.player_id, CONCAT(p.first_name, ' ', p.last_name) AS player_name,
      p.registration_number, p.birth_date, e.requested_category, e.status, e.season_label, p.photo_url,
      e.group_id, g.group_name, COALESCE(a.display_name, pa.display_name) AS guardian_name,
      COALESCE(a.email, pa.email) AS guardian_email, COALESCE(a.phone, pa.phone) AS guardian_phone,
      p.medical_notes, p.video_url, p.identity_document_data IS NOT NULL AS identity_document_available, e.submitted_at
     FROM academy_enrollments e
     JOIN academy_players p ON p.player_id = e.player_id
         LEFT JOIN academy_player_guardians pg ON pg.player_id = p.player_id AND pg.is_primary = TRUE
         LEFT JOIN academy_guardians gu ON gu.guardian_id = pg.guardian_id
         LEFT JOIN academy_accounts a ON a.account_id = gu.account_id
         LEFT JOIN academy_accounts pa ON pa.account_id = p.account_id
     LEFT JOIN academy_groups g ON g.group_id = e.group_id
     ORDER BY FIELD(e.status, 'submitted', 'review', 'trial', 'accepted', 'active', 'suspended', 'rejected', 'left'), e.submitted_at DESC`,
  );
  return rows.map((row) => ({ id: Number(row.enrollment_id), playerId: Number(row.player_id), playerName: row.player_name,
    registrationNumber: row.registration_number, birthDate: new Date(row.birth_date).toISOString().slice(0, 10), category: row.requested_category,
    status: row.status, season: row.season_label, photoUrl: safeAcademyPhotoUrl(row.photo_url), groupId: row.group_id ? Number(row.group_id) : null,
    groupName: row.group_name, guardianName: row.guardian_name, guardianEmail: row.guardian_email,
    guardianPhone: row.guardian_phone, medicalNotes: row.medical_notes, videoUrl: row.video_url,
    identityDocumentAvailable: Boolean(row.identity_document_available), submittedAt: new Date(row.submitted_at).toISOString() }));
}

export async function getAcademyCounts() {
  await ensureDatabaseSchema();
  const [rows] = await getDatabasePool().query<(RowDataPacket & { applications: number; active_players: number; coaches: number; groups_count: number })[]>(
    `SELECT
      (SELECT COUNT(*) FROM academy_enrollments WHERE status IN ('submitted','review','trial')) AS applications,
      (SELECT COUNT(*) FROM academy_enrollments WHERE status = 'active') AS active_players,
      (SELECT COUNT(*) FROM academy_accounts WHERE role = 'coach' AND is_active = TRUE) AS coaches,
      (SELECT COUNT(*) FROM academy_groups WHERE is_active = TRUE) AS groups_count`,
  );
  const row = rows[0];
  return { applications: Number(row?.applications || 0), activePlayers: Number(row?.active_players || 0),
    coaches: Number(row?.coaches || 0), groups: Number(row?.groups_count || 0) };
}

export async function getAcademyCountsSafe() {
  try {
    return await getAcademyCounts();
  } catch {
    return { applications: 0, activePlayers: 0, coaches: 0, groups: 0 };
  }
}

export async function createCoach(input: { username: string; email: string; name: string; phone: string; password: string; licenseLevel: string; specialty: string }, adminId: number) {
  await ensureDatabaseSchema();
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    const passwordHash = await hash(input.password, 12);
    const [account] = await connection.execute<ResultSetHeader>(
      `INSERT INTO academy_accounts (username, email, display_name, password_hash, role, phone, created_by_admin_id)
       VALUES (?, ?, ?, ?, 'coach', ?, ?)`, [input.username, input.email, input.name, passwordHash, input.phone, adminId],
    );
    await connection.execute(
      "INSERT INTO academy_coaches (account_id, license_level, specialty) VALUES (?, ?, ?)",
      [account.insertId, input.licenseLevel || null, input.specialty || null],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new AcademyError("duplicate");
    throw error;
  } finally {
    connection.release();
  }
}

export async function createAcademyGroup(input: { category: AcademyCategory; name: string; season: string; capacity: number; venue: string; coachId: number | null }, adminId: number) {
  await ensureDatabaseSchema();
  try {
    await getDatabasePool().execute(
      `INSERT INTO academy_groups (age_category, group_name, season_label, capacity, default_venue, coach_id, created_by_admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [input.category, input.name, input.season, input.capacity, input.venue, input.coachId, adminId],
    );
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new AcademyError("duplicate");
    throw error;
  }
}

type AcademyPlayerApplication = {
  relationship: string; firstName: string; lastName: string; birthDate: string; gender: "male" | "female";
  nationality: string; birthPlace: string; schoolName: string; schoolLevel: string; preferredFoot: "right" | "left" | "both" | "unknown";
  medicalNotes: string; videoUrl: string; photoUrl: string; consentMedical: boolean; consentImage: boolean;
};

async function insertPlayerApplication(
  connection: PoolConnection,
  input: AcademyPlayerApplication,
  accountId: number | null,
  guardianId: number | null,
  season: string,
) {
  const category = categoryForBirthDate(input.birthDate, season);
  if (!category) throw new AcademyError("invalid-group");
  const registrationNumber = `UTS-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const [player] = await connection.execute<ResultSetHeader>(
    `INSERT INTO academy_players (account_id, registration_number, first_name, last_name, birth_date, gender, nationality,
      birth_place, school_name, school_level, preferred_foot, medical_notes, video_url, photo_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [accountId, registrationNumber, input.firstName, input.lastName, input.birthDate, input.gender, input.nationality,
      input.birthPlace || null, input.schoolName || null, input.schoolLevel || null, input.preferredFoot,
      input.medicalNotes || null, input.videoUrl || null, input.photoUrl],
  );
  if (guardianId) {
    await connection.execute(
      `INSERT INTO academy_player_guardians (player_id, guardian_id, relationship_label, is_primary)
       VALUES (?, ?, ?, TRUE)`, [player.insertId, guardianId, input.relationship],
    );
  }
  await connection.execute(
    `INSERT INTO academy_enrollments (player_id, season_label, requested_category, consent_medical, consent_image)
     VALUES (?, ?, ?, ?, ?)`, [player.insertId, season, category, input.consentMedical, input.consentImage],
  );
  return { playerId: Number(player.insertId), registrationNumber, category };
}

export async function createGuardianApplication(input: {
  username: string; email: string; guardianName: string; phone: string; password: string; address: string; city: string; emergencyPhone: string;
  player: AcademyPlayerApplication; additionalPlayers: AcademyPlayerApplication[];
}) {
  await ensureDatabaseSchema();
  const players = [input.player, ...input.additionalPlayers];
  if (players.some((player) => isAdultAcademyApplicant(player.birthDate))) throw new AcademyError("age-policy");
  const { seasonLabel } = await getAcademyRegistrationSettings();
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    const passwordHash = await hash(input.password, 12);
    const [account] = await connection.execute<ResultSetHeader>(
      `INSERT INTO academy_accounts (username, email, display_name, password_hash, role, phone)
       VALUES (?, ?, ?, ?, 'guardian', ?)`, [input.username, input.email, input.guardianName, passwordHash, input.phone],
    );
    const [guardian] = await connection.execute<ResultSetHeader>(
      "INSERT INTO academy_guardians (account_id, address_text, city, emergency_phone) VALUES (?, ?, ?, ?)",
      [account.insertId, input.address, input.city, input.emergencyPhone],
    );
    const registrations = [];
    for (const player of players) {
      registrations.push(await insertPlayerApplication(connection, player, null, Number(guardian.insertId), seasonLabel));
    }
    await connection.commit();
    return { accountId: Number(account.insertId), registrations };
  } catch (error) {
    await connection.rollback();
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new AcademyError("duplicate");
    throw error;
  } finally {
    connection.release();
  }
}

export async function createIndependentPlayerApplication(input: {
  username: string; email: string; phone: string; password: string;
  identityDocument: { name: string; mimeType: string; bytes: Buffer };
  player: AcademyPlayerApplication;
}) {
  await ensureDatabaseSchema();
  if (!isAdultAcademyApplicant(input.player.birthDate)) throw new AcademyError("age-policy");
  const { seasonLabel } = await getAcademyRegistrationSettings();
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    const passwordHash = await hash(input.password, 12);
    const [account] = await connection.execute<ResultSetHeader>(
      `INSERT INTO academy_accounts (username, email, display_name, password_hash, role, phone)
       VALUES (?, ?, ?, ?, 'player', ?)`,
      [input.username, input.email, `${input.player.firstName} ${input.player.lastName}`, passwordHash, input.phone],
    );
    const registration = await insertPlayerApplication(connection, input.player, Number(account.insertId), null, seasonLabel);
    await connection.execute(
      `UPDATE academy_players SET identity_document_name = ?, identity_document_mime = ?, identity_document_data = ?
       WHERE player_id = ?`,
      [input.identityDocument.name, input.identityDocument.mimeType, input.identityDocument.bytes, registration.playerId],
    );
    await connection.commit();
    return { accountId: Number(account.insertId), registration };
  } catch (error) {
    await connection.rollback();
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new AcademyError("duplicate");
    throw error;
  } finally {
    connection.release();
  }
}

export async function createPlayerForGuardian(input: {
  accountId: number; relationship: string; firstName: string; lastName: string; birthDate: string;
  gender: "male" | "female"; nationality: string; schoolName: string; preferredFoot: "right" | "left" | "both" | "unknown";
  medicalNotes: string; videoUrl: string; photoUrl: string; consentMedical: boolean; consentImage: boolean;
}) {
  await ensureDatabaseSchema();
  if (isAdultAcademyApplicant(input.birthDate)) throw new AcademyError("age-policy");
  const { seasonLabel } = await getAcademyRegistrationSettings();
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    const [guardians] = await connection.query<(RowDataPacket & { guardian_id: number })[]>(
      "SELECT guardian_id FROM academy_guardians WHERE account_id = ? LIMIT 1", [input.accountId],
    );
    if (!guardians[0]) throw new AcademyError("forbidden");
    const result = await insertPlayerApplication(connection, { ...input, birthPlace: "", schoolLevel: "" }, null, Number(guardians[0].guardian_id), seasonLabel);
    await connection.commit();
    return result.registrationNumber;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateEnrollment(input: { enrollmentId: number; status: EnrollmentStatus; groupId: number | null }, adminId: number) {
  await ensureDatabaseSchema();
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    const [enrollments] = await connection.query<(RowDataPacket & { requested_category: AcademyCategory })[]>(
      "SELECT requested_category FROM academy_enrollments WHERE enrollment_id = ? FOR UPDATE", [input.enrollmentId],
    );
    if (!enrollments[0]) throw new AcademyError("not-found");
    if (input.groupId) {
      const [groups] = await connection.query<(RowDataPacket & { age_category: AcademyCategory; capacity: number; player_count: number })[]>(
        `SELECT g.age_category, g.capacity,
          (SELECT COUNT(*) FROM academy_enrollments e WHERE e.group_id = g.group_id AND e.status = 'active' AND e.enrollment_id <> ?) AS player_count
         FROM academy_groups g WHERE g.group_id = ? AND g.is_active = TRUE FOR UPDATE`, [input.enrollmentId, input.groupId],
      );
      if (!groups[0] || groups[0].age_category !== enrollments[0].requested_category) throw new AcademyError("invalid-group");
      if (input.status === "active" && Number(groups[0].player_count) >= Number(groups[0].capacity)) throw new AcademyError("capacity");
    }
    await connection.execute(
      `UPDATE academy_enrollments SET status = ?, group_id = ?, updated_by_admin_id = ?,
        trial_at = IF(? = 'trial' AND trial_at IS NULL, UTC_TIMESTAMP(), trial_at),
        decision_at = IF(? IN ('accepted','rejected') AND decision_at IS NULL, UTC_TIMESTAMP(), decision_at)
       WHERE enrollment_id = ?`, [input.status, input.groupId, adminId, input.status, input.status, input.enrollmentId],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createTrainingSession(input: { groupId: number; startsAt: string; endsAt: string; venue: string; focus: string }, accountId: number) {
  await ensureDatabaseSchema();
  const [coaches] = await getDatabasePool().query<(RowDataPacket & { coach_id: number })[]>(
    `SELECT c.coach_id FROM academy_coaches c JOIN academy_groups g ON g.coach_id = c.coach_id
     WHERE c.account_id = ? AND g.group_id = ? AND g.is_active = TRUE LIMIT 1`, [accountId, input.groupId],
  );
  if (!coaches[0]) throw new AcademyError("forbidden");
  const [conflicts] = await getDatabasePool().query<RowDataPacket[]>(
    `SELECT 1 FROM academy_training_sessions
     WHERE status <> 'cancelled' AND (group_id = ? OR coach_id = ?) AND starts_at < ? AND ends_at > ? LIMIT 1`,
    [input.groupId, coaches[0].coach_id, input.endsAt, input.startsAt],
  );
  if (conflicts[0]) throw new AcademyError("schedule-conflict");
  await getDatabasePool().execute(
    `INSERT INTO academy_training_sessions (group_id, coach_id, starts_at, ends_at, venue, focus_text)
     VALUES (?, ?, ?, ?, ?, ?)`, [input.groupId, coaches[0].coach_id, input.startsAt, input.endsAt, input.venue, input.focus],
  );
}

export async function saveSessionAttendance(
  sessionId: number,
  entries: Array<{ playerId: number; status: "present" | "late" | "absent" | "excused" }>,
  accountId: number,
) {
  await ensureDatabaseSchema();
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    const [sessions] = await connection.query<(RowDataPacket & { group_id: number })[]>(
      `SELECT s.group_id FROM academy_training_sessions s JOIN academy_coaches c ON c.coach_id = s.coach_id
       WHERE s.session_id = ? AND c.account_id = ? AND s.ends_at <= UTC_TIMESTAMP() LIMIT 1`, [sessionId, accountId],
    );
    if (!sessions[0]) throw new AcademyError("forbidden");
    for (const entry of entries) {
      const [players] = await connection.query<RowDataPacket[]>(
        `SELECT 1 FROM academy_enrollments WHERE player_id = ? AND group_id = ? AND status IN ('accepted','active','suspended') LIMIT 1`,
        [entry.playerId, sessions[0].group_id],
      );
      if (!players[0]) throw new AcademyError("forbidden");
      await connection.execute(
        `INSERT INTO academy_attendance (session_id, player_id, status) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), recorded_at = CURRENT_TIMESTAMP`,
        [sessionId, entry.playerId, entry.status],
      );
    }
    await connection.execute("UPDATE academy_training_sessions SET status = 'completed' WHERE session_id = ?", [sessionId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createPlayerNote(input: { playerId: number; category: string; visibility: string; note: string }, author: { accountId?: number; adminId?: number }) {
  await ensureDatabaseSchema();
  if (Boolean(author.accountId) === Boolean(author.adminId)) throw new AcademyError("forbidden");
  if (author.accountId) {
    const [rows] = await getDatabasePool().query<RowDataPacket[]>(
      `SELECT 1 FROM academy_coaches c JOIN academy_groups g ON g.coach_id = c.coach_id
       JOIN academy_enrollments e ON e.group_id = g.group_id
       WHERE c.account_id = ? AND e.player_id = ? LIMIT 1`, [author.accountId, input.playerId],
    );
    if (!rows[0]) throw new AcademyError("forbidden");
  }
  await getDatabasePool().execute(
    `INSERT INTO academy_player_notes (player_id, author_account_id, author_admin_id, category, visibility, note_text)
     VALUES (?, ?, ?, ?, ?, ?)`, [input.playerId, author.accountId || null, author.adminId || null, input.category, input.visibility, input.note],
  );
}

export async function getGuardianDashboard(accountId: number) {
  await ensureDatabaseSchema();
  const [players] = await getDatabasePool().query<(RowDataPacket & {
    player_id: number; player_name: string; registration_number: string; photo_url: string; status: EnrollmentStatus;
    requested_category: AcademyCategory; group_name: string | null; season_label: string;
  })[]>(
    `SELECT p.player_id, CONCAT(p.first_name, ' ', p.last_name) AS player_name, p.registration_number, p.photo_url,
      e.status, e.requested_category, e.season_label, g.group_name
    FROM academy_players p
    LEFT JOIN academy_player_guardians pg ON pg.player_id = p.player_id
    LEFT JOIN academy_guardians gu ON pg.guardian_id = gu.guardian_id
     JOIN academy_enrollments e ON e.player_id = p.player_id
    LEFT JOIN academy_groups g ON g.group_id = e.group_id
    WHERE gu.account_id = ? OR p.account_id = ? ORDER BY e.submitted_at DESC`, [accountId, accountId],
  );
  const playerIds = players.map((row) => Number(row.player_id));
  if (!playerIds.length) return { players: [], sessions: [], notes: [] };
  const placeholders = playerIds.map(() => "?").join(",");
  const [sessions] = await getDatabasePool().query<(RowDataPacket & {
    session_id: number; group_id: number; group_name: string; age_category: AcademyCategory; coach_name: string;
    starts_at: Date | string; ends_at: Date | string; venue: string; focus_text: string; status: AcademySession["status"];
  })[]>(
    `SELECT DISTINCT s.session_id, s.group_id, g.group_name, g.age_category, a.display_name AS coach_name,
      s.starts_at, s.ends_at, s.venue, s.focus_text, s.status
     FROM academy_training_sessions s JOIN academy_groups g ON g.group_id = s.group_id
     JOIN academy_coaches c ON c.coach_id = s.coach_id JOIN academy_accounts a ON a.account_id = c.account_id
     JOIN academy_enrollments e ON e.group_id = g.group_id
     WHERE e.player_id IN (${placeholders}) AND s.starts_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)
     ORDER BY s.starts_at LIMIT 30`, playerIds,
  );
  const [notes] = await getDatabasePool().query<(RowDataPacket & { note_id: number; player_id: number; player_name: string; category: string; note_text: string; author_name: string; created_at: Date | string })[]>(
    `SELECT n.note_id, n.player_id, CONCAT(p.first_name, ' ', p.last_name) AS player_name, n.category, n.note_text,
      COALESCE(a.display_name, ad.display_name, 'Administration') AS author_name, n.created_at
     FROM academy_player_notes n JOIN academy_players p ON p.player_id = n.player_id
     LEFT JOIN academy_accounts a ON a.account_id = n.author_account_id LEFT JOIN admin_users ad ON ad.id = n.author_admin_id
     WHERE n.player_id IN (${placeholders}) AND n.visibility = 'guardian' ORDER BY n.created_at DESC LIMIT 30`, playerIds,
  );
  return {
    players: players.map((row) => ({ id: Number(row.player_id), name: row.player_name, registrationNumber: row.registration_number,
      photoUrl: safeAcademyPhotoUrl(row.photo_url), status: row.status, category: row.requested_category, groupName: row.group_name, season: row.season_label })),
    sessions: sessions.map((row) => ({ id: Number(row.session_id), groupId: Number(row.group_id), groupName: row.group_name,
      category: row.age_category, coachName: row.coach_name, startsAt: new Date(row.starts_at).toISOString(), endsAt: new Date(row.ends_at).toISOString(),
      venue: row.venue, focus: row.focus_text, status: row.status })),
    notes: notes.map((row) => ({ id: Number(row.note_id), playerId: Number(row.player_id), playerName: row.player_name,
      category: row.category, text: row.note_text, authorName: row.author_name, createdAt: new Date(row.created_at).toISOString() })),
  };
}

export async function getCoachDashboard(accountId: number) {
  await ensureDatabaseSchema();
  const [coachRows] = await getDatabasePool().query<(RowDataPacket & { coach_id: number })[]>("SELECT coach_id FROM academy_coaches WHERE account_id = ?", [accountId]);
  if (!coachRows[0]) throw new AcademyError("forbidden");
  const coachId = Number(coachRows[0].coach_id);
  const groups = (await listAcademyGroups(true)).filter((group) => group.coachId === coachId);
  const [players] = await getDatabasePool().query<(RowDataPacket & { player_id: number; player_name: string; registration_number: string; photo_url: string; medical_notes: string | null; status: EnrollmentStatus; group_id: number; group_name: string; age_category: AcademyCategory })[]>(
    `SELECT p.player_id, CONCAT(p.first_name, ' ', p.last_name) AS player_name, p.registration_number, p.photo_url, p.medical_notes,
      e.status, g.group_id, g.group_name, g.age_category FROM academy_enrollments e
     JOIN academy_players p ON p.player_id = e.player_id JOIN academy_groups g ON g.group_id = e.group_id
     WHERE g.coach_id = ? AND e.status IN ('trial','accepted','active','suspended') ORDER BY g.age_category, p.last_name`, [coachId],
  );
  const [sessions] = await getDatabasePool().query<(RowDataPacket & { session_id: number; group_id: number; group_name: string; age_category: AcademyCategory; coach_name: string; starts_at: Date | string; ends_at: Date | string; venue: string; focus_text: string; status: AcademySession["status"] })[]>(
    `SELECT s.session_id, s.group_id, g.group_name, g.age_category, a.display_name AS coach_name, s.starts_at,
      s.ends_at, s.venue, s.focus_text, s.status FROM academy_training_sessions s
     JOIN academy_groups g ON g.group_id = s.group_id JOIN academy_coaches c ON c.coach_id = s.coach_id
     JOIN academy_accounts a ON a.account_id = c.account_id WHERE s.coach_id = ? ORDER BY s.starts_at DESC LIMIT 40`, [coachId],
  );
  const [attendance] = await getDatabasePool().query<(RowDataPacket & { session_id: number; player_id: number; status: "present" | "late" | "absent" | "excused" })[]>(
     `SELECT at.session_id, at.player_id, at.status FROM academy_attendance at
      JOIN academy_training_sessions s ON s.session_id = at.session_id WHERE s.coach_id = ?`, [coachId],
    );
  return { groups, players: players.map((row) => ({ id: Number(row.player_id), name: row.player_name,
      registrationNumber: row.registration_number, photoUrl: safeAcademyPhotoUrl(row.photo_url), medicalNotes: row.medical_notes,
      status: row.status, groupId: Number(row.group_id),
    groupName: row.group_name, category: row.age_category })), sessions: sessions.map((row) => ({ id: Number(row.session_id),
    groupId: Number(row.group_id), groupName: row.group_name, category: row.age_category, coachName: row.coach_name,
    startsAt: new Date(row.starts_at).toISOString(), endsAt: new Date(row.ends_at).toISOString(), venue: row.venue,
    focus: row.focus_text, status: row.status })), attendance: attendance.map((row) => ({ sessionId: Number(row.session_id),
    playerId: Number(row.player_id), status: row.status })) };
}

export async function getAcademyIdentityDocument(playerId: number) {
  await ensureDatabaseSchema();
  const [rows] = await getDatabasePool().query<(RowDataPacket & {
    identity_document_name: string; identity_document_mime: string; identity_document_data: Buffer;
  })[]>(
    `SELECT identity_document_name, identity_document_mime, identity_document_data
     FROM academy_players WHERE player_id = ? AND identity_document_data IS NOT NULL LIMIT 1`,
    [playerId],
  );
  const row = rows[0];
  return row ? { name: row.identity_document_name, mimeType: row.identity_document_mime, bytes: row.identity_document_data } : null;
}