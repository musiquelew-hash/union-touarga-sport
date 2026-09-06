import type { ExecuteValues } from "mysql2";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { ensureDatabaseSchema, getDatabasePool, isDatabaseConfigured } from "@/lib/database";
import { defaultSiteContent, type SiteContent } from "@/lib/site-content-defaults";

export const cmsKinds = ["player", "staff", "news", "media"] as const;
export type CmsKind = (typeof cmsKinds)[number];

export type CmsRecord<T> = {
  id: number;
  kind: CmsKind;
  key: string;
  data: T;
  published: boolean;
  sortOrder: number;
  sourceName: string;
  syncWithSource: boolean;
  updatedAt: string;
};

export type CmsCategory<T> = {
  configured: boolean;
  records: CmsRecord<T>[];
};

type RelationalRow = RowDataPacket & {
  cms_id: number;
  record_key: string;
  player_id?: number;
  staff_id?: number;
  article_id?: number;
  media_id?: string;
  full_name?: string;
  short_name?: string;
  shirt_number?: string | null;
  position?: string;
  age?: number | null;
  height_cm?: number | null;
  preferred_foot?: string | null;
  nationality?: string;
  country_code?: string | null;
  image_url?: string | null;
  appearances?: number | null;
  goals?: number | null;
  assists?: number | null;
  rating?: number | string | null;
  role_title?: string;
  department?: string;
  title?: string;
  article_url?: string;
  image_alt?: string;
  media_url?: string;
  thumbnail_url?: string | null;
  published_at?: Date | string | null;
  is_published: number | boolean;
  sort_order: number;
  source_name: string;
  sync_with_source: number | boolean;
  updated_at: Date | string;
};

type LegacyRecordRow = RowDataPacket & {
  kind: string;
  record_key: string;
  payload: string | object;
  is_published: number | boolean;
  sort_order: number;
};

type LegacySettingRow = RowDataPacket & {
  payload: string | object;
};

type SiteContentRow = RowDataPacket & {
  strip_primary: string;
  strip_secondary: string;
  hero_kicker: string;
  hero_title_top: string;
  hero_title_bottom: string;
  hero_lead_strong: string;
  hero_lead: string;
  manifesto_title: string;
  manifesto_copy: string;
  club_intro_title: string;
  club_intro_paragraph_one: string;
  club_intro_paragraph_two: string;
  club_venue_title: string;
  club_venue_copy: string;
  footer_statement: string;
  instagram_url: string;
  youtube_url: string;
};

type MilestoneRow = RowDataPacket & {
  year_label: string;
  title: string;
  body: string;
};

type WriteMode = "dashboard" | "official" | "legacy";
type Execute = (sql: string, values: ExecuteValues[]) => Promise<unknown>;

const tableByKind: Record<CmsKind, string> = {
  player: "players",
  staff: "staff_members",
  news: "news_articles",
  media: "media_items",
};

const LEGACY_MIGRATION = "001_legacy_json_to_relational";
const LEGACY_CLEANUP_MIGRATION = "002_drop_legacy_json_tables";
const globalForCms = globalThis as typeof globalThis & {
  utsRelationalCmsSchema?: Promise<void>;
};

function parseJson<T>(value: string | object): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function unixTimestamp(value: Date | string | null | undefined) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : null;
}

function databaseDate(value: unknown) {
  const timestamp = nullableNumber(value);
  if (timestamp === null) return null;
  return new Date(timestamp * 1000).toISOString().slice(0, 19).replace("T", " ");
}

function mapData(kind: CmsKind, row: RelationalRow) {
  switch (kind) {
    case "player":
      return {
        id: Number(row.player_id),
        name: row.full_name || "",
        shortName: row.short_name || row.full_name || "",
        number: row.shirt_number || null,
        position: row.position || "Joueur",
        age: nullableNumber(row.age),
        height: nullableNumber(row.height_cm),
        foot: row.preferred_foot || null,
        nationality: row.nationality || "N.C.",
        countryCode: row.country_code || null,
        imageUrl: row.image_url || "",
        appearances: nullableNumber(row.appearances),
        goals: nullableNumber(row.goals),
        assists: nullableNumber(row.assists),
        rating: nullableNumber(row.rating),
      };
    case "staff":
      return {
        id: Number(row.staff_id),
        name: row.full_name || "",
        role: row.role_title || "",
        department: row.department || "Autre",
        imageUrl: row.image_url || "",
      };
    case "news":
      return {
        id: Number(row.article_id),
        title: row.title || "",
        url: row.article_url || "",
        imageUrl: row.image_url || null,
        imageAlt: row.image_alt || "",
        timestamp: unixTimestamp(row.published_at),
      };
    case "media":
      return {
        id: row.media_id || row.record_key,
        title: row.title || "",
        url: row.media_url || "",
        thumbnailUrl: row.thumbnail_url || null,
        timestamp: unixTimestamp(row.published_at),
      };
  }
}

function mapRecord<T>(kind: CmsKind, row: RelationalRow): CmsRecord<T> {
  return {
    id: Number(row.cms_id),
    kind,
    key: row.record_key,
    data: mapData(kind, row) as T,
    published: Boolean(row.is_published),
    sortOrder: Number(row.sort_order),
    sourceName: row.source_name,
    syncWithSource: Boolean(row.sync_with_source),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function duplicateAssignments(columns: string[], mode: Exclude<WriteMode, "legacy">) {
  const mutableColumns = columns.filter((column) => column !== "record_key" && column !== "sync_with_source");

  if (mode === "dashboard") {
    return [...mutableColumns.map((column) => `${column} = VALUES(${column})`), "sync_with_source = FALSE"].join(", ");
  }

  return [
    ...mutableColumns.map((column) => `${column} = IF(sync_with_source = TRUE, VALUES(${column}), ${column})`),
    "sync_with_source = IF(sync_with_source = TRUE, TRUE, sync_with_source)",
  ].join(", ");
}

async function insertRow(
  execute: Execute,
  table: string,
  columns: string[],
  values: ExecuteValues[],
  mode: WriteMode,
) {
  const verb = mode === "legacy" ? "INSERT IGNORE" : "INSERT";
  const duplicate = mode === "legacy" ? "" : ` ON DUPLICATE KEY UPDATE ${duplicateAssignments(columns, mode)}`;
  await execute(
    `${verb} INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})${duplicate}`,
    values,
  );
}

async function writeCmsRecord<T>(
  execute: Execute,
  kind: CmsKind,
  record: { key: string; data: T; published: boolean; sortOrder: number },
  mode: WriteMode,
  actorAdminId: number | null,
) {
  const data = record.data as unknown as Record<string, ExecuteValues>;
  const sourceName = mode === "dashboard" ? "dashboard" : "official";
  const syncWithSource = mode !== "dashboard";

  switch (kind) {
    case "player":
      return insertRow(
        execute,
        tableByKind.player,
        [
          "record_key", "player_id", "full_name", "short_name", "shirt_number", "position", "age",
          "height_cm", "preferred_foot", "nationality", "country_code", "image_url", "appearances",
          "goals", "assists", "rating", "is_published", "sort_order", "source_name",
          "updated_by_admin_id", "sync_with_source",
        ],
        [
          record.key, data.id, data.name, data.shortName, data.number, data.position, data.age, data.height,
          data.foot, data.nationality, data.countryCode, data.imageUrl, data.appearances, data.goals,
          data.assists, data.rating, record.published, record.sortOrder, sourceName, actorAdminId, syncWithSource,
        ],
        mode,
      );
    case "staff":
      return insertRow(
        execute,
        tableByKind.staff,
        [
          "record_key", "staff_id", "full_name", "role_title", "department", "image_url",
          "is_published", "sort_order", "source_name", "updated_by_admin_id", "sync_with_source",
        ],
        [
          record.key, data.id, data.name, data.role, data.department, data.imageUrl, record.published,
          record.sortOrder, sourceName, actorAdminId, syncWithSource,
        ],
        mode,
      );
    case "news":
      return insertRow(
        execute,
        tableByKind.news,
        [
          "record_key", "article_id", "title", "article_url", "image_url", "image_alt", "published_at",
          "is_published", "sort_order", "source_name", "updated_by_admin_id", "sync_with_source",
        ],
        [
          record.key, data.id, data.title, data.url, data.imageUrl, data.imageAlt, databaseDate(data.timestamp),
          record.published, record.sortOrder, sourceName, actorAdminId, syncWithSource,
        ],
        mode,
      );
    case "media":
      return insertRow(
        execute,
        tableByKind.media,
        [
          "record_key", "media_id", "title", "media_url", "thumbnail_url", "published_at",
          "is_published", "sort_order", "source_name", "updated_by_admin_id", "sync_with_source",
        ],
        [
          record.key, data.id, data.title, data.url, data.thumbnailUrl, databaseDate(data.timestamp),
          record.published, record.sortOrder, sourceName, actorAdminId, syncWithSource,
        ],
        mode,
      );
  }
}

async function tableExists(connection: PoolConnection, table: string) {
  const [rows] = await connection.query<RowDataPacket[]>(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1",
    [table],
  );
  return rows.length > 0;
}

async function writeSiteContent(
  connection: PoolConnection,
  content: SiteContent,
  actorAdminId: number | null,
  onlyIfMissing: boolean,
) {
  const verb = onlyIfMissing ? "INSERT IGNORE" : "INSERT";
  const duplicate = onlyIfMissing
    ? ""
    : ` ON DUPLICATE KEY UPDATE
      strip_primary = VALUES(strip_primary), strip_secondary = VALUES(strip_secondary),
      hero_kicker = VALUES(hero_kicker), hero_title_top = VALUES(hero_title_top),
      hero_title_bottom = VALUES(hero_title_bottom), hero_lead_strong = VALUES(hero_lead_strong),
      hero_lead = VALUES(hero_lead), manifesto_title = VALUES(manifesto_title),
      manifesto_copy = VALUES(manifesto_copy), club_intro_title = VALUES(club_intro_title),
      club_intro_paragraph_one = VALUES(club_intro_paragraph_one),
      club_intro_paragraph_two = VALUES(club_intro_paragraph_two),
      club_venue_title = VALUES(club_venue_title), club_venue_copy = VALUES(club_venue_copy),
      footer_statement = VALUES(footer_statement), instagram_url = VALUES(instagram_url),
      youtube_url = VALUES(youtube_url), updated_by_admin_id = VALUES(updated_by_admin_id)`;
  const [result] = await connection.execute<ResultSetHeader>(
    `${verb} INTO site_content (
      content_id, strip_primary, strip_secondary, hero_kicker, hero_title_top, hero_title_bottom,
      hero_lead_strong, hero_lead, manifesto_title, manifesto_copy, club_intro_title,
      club_intro_paragraph_one, club_intro_paragraph_two, club_venue_title, club_venue_copy,
      footer_statement, instagram_url, youtube_url, updated_by_admin_id
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)${duplicate}`,
    [
      content.stripPrimary,
      content.stripSecondary,
      content.heroKicker,
      content.heroTitleTop,
      content.heroTitleBottom,
      content.heroLeadStrong,
      content.heroLead,
      content.manifestoTitle,
      content.manifestoCopy,
      content.clubIntroTitle,
      content.clubIntroParagraphOne,
      content.clubIntroParagraphTwo,
      content.clubVenueTitle,
      content.clubVenueCopy,
      content.footerStatement,
      content.instagramUrl,
      content.youtubeUrl,
      actorAdminId,
    ],
  );

  if (onlyIfMissing && result.affectedRows === 0) return;

  await connection.execute("DELETE FROM club_milestones WHERE content_id = 1");
  for (const [index, milestone] of content.clubMilestones.entries()) {
    await connection.execute(
      `INSERT INTO club_milestones (content_id, year_label, title, body, sort_order)
       VALUES (1, ?, ?, ?, ?)`,
      [milestone.year, milestone.title, milestone.copy, index],
    );
  }
}

async function migrateLegacyCmsData() {
  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    const [migrationRows] = await connection.query<RowDataPacket[]>(
      "SELECT 1 FROM schema_migrations WHERE migration_key = ? LIMIT 1",
      [LEGACY_MIGRATION],
    );
    if (migrationRows.length > 0) return;

    await connection.beginTransaction();

    if (await tableExists(connection, "cms_records")) {
      const [legacyRows] = await connection.query<LegacyRecordRow[]>(
        "SELECT kind, record_key, payload, is_published, sort_order FROM cms_records",
      );

      for (const row of legacyRows) {
        if (!cmsKinds.includes(row.kind as CmsKind)) continue;
        await writeCmsRecord(
          (sql, values) => connection.execute(sql, values),
          row.kind as CmsKind,
          {
            key: row.record_key,
            data: parseJson<unknown>(row.payload),
            published: Boolean(row.is_published),
            sortOrder: Number(row.sort_order),
          },
          "legacy",
          null,
        );
      }
    }

    let initialContent = defaultSiteContent;
    if (await tableExists(connection, "cms_settings")) {
      const [settingRows] = await connection.query<LegacySettingRow[]>(
        "SELECT payload FROM cms_settings WHERE setting_key = 'site-content' LIMIT 1",
      );
      if (settingRows[0]) {
        initialContent = { ...defaultSiteContent, ...parseJson<Partial<SiteContent>>(settingRows[0].payload) };
      }
    }

    await writeSiteContent(connection, initialContent, null, true);
    await connection.execute(
      "INSERT IGNORE INTO schema_migrations (migration_key) VALUES (?)",
      [LEGACY_MIGRATION],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function removeLegacyCmsTables() {
  const pool = getDatabasePool();
  const [migrationRows] = await pool.query<RowDataPacket[]>(
    "SELECT 1 FROM schema_migrations WHERE migration_key = ? LIMIT 1",
    [LEGACY_CLEANUP_MIGRATION],
  );
  if (migrationRows.length > 0) return;

  await pool.query("DROP TABLE IF EXISTS cms_records, cms_settings");
  await pool.execute(
    "INSERT IGNORE INTO schema_migrations (migration_key) VALUES (?)",
    [LEGACY_CLEANUP_MIGRATION],
  );
}

export function isCmsDatabaseConfigured() {
  return isDatabaseConfigured();
}

export async function ensureCmsSchema() {
  if (!globalForCms.utsRelationalCmsSchema) {
    globalForCms.utsRelationalCmsSchema = (async () => {
      await ensureDatabaseSchema();
      await migrateLegacyCmsData();
      await removeLegacyCmsTables();
    })().catch((error) => {
      globalForCms.utsRelationalCmsSchema = undefined;
      throw error;
    });
  }

  await globalForCms.utsRelationalCmsSchema;
}

export async function getCmsCategory<T>(kind: CmsKind, includeUnpublished = false): Promise<CmsCategory<T>> {
  await ensureCmsSchema();
  const table = tableByKind[kind];
  const pool = getDatabasePool();
  const [countRows] = await pool.query<(RowDataPacket & { total: number })[]>(`SELECT COUNT(*) AS total FROM ${table}`);
  const [rows] = await pool.query<RelationalRow[]>(
    `SELECT * FROM ${table} ${includeUnpublished ? "" : "WHERE is_published = TRUE"}
     ORDER BY sort_order ASC, updated_at DESC`,
  );

  return {
    configured: Number(countRows[0]?.total || 0) > 0,
    records: rows.map((row) => mapRecord<T>(kind, row)),
  };
}

export async function getCmsCategorySafe<T>(kind: CmsKind): Promise<CmsCategory<T>> {
  if (!isCmsDatabaseConfigured()) return { configured: false, records: [] };

  try {
    return await getCmsCategory<T>(kind);
  } catch (error) {
    console.error(`[CMS] Lecture impossible pour ${kind}`, error);
    return { configured: false, records: [] };
  }
}

export async function getCmsCategoryAdminSafe<T>(kind: CmsKind): Promise<CmsCategory<T>> {
  if (!isCmsDatabaseConfigured()) return { configured: false, records: [] };

  try {
    return await getCmsCategory<T>(kind, true);
  } catch (error) {
    console.error(`[CMS] Lecture administrateur impossible pour ${kind}`, error);
    return { configured: false, records: [] };
  }
}

export async function upsertCmsRecord<T>({
  kind,
  key,
  data,
  published,
  sortOrder,
  actorAdminId = null,
}: {
  kind: CmsKind;
  key: string;
  data: T;
  published: boolean;
  sortOrder: number;
  actorAdminId?: number | null;
}) {
  await ensureCmsSchema();
  const pool = getDatabasePool();
  await writeCmsRecord(
    (sql, values) => pool.execute(sql, values),
    kind,
    { key, data, published, sortOrder },
    "dashboard",
    actorAdminId,
  );
}

export async function deleteCmsRecord(kind: CmsKind, key: string) {
  await ensureCmsSchema();
  await getDatabasePool().execute(`DELETE FROM ${tableByKind[kind]} WHERE record_key = ?`, [key]);
}

export async function clearCmsCategory(kind: CmsKind) {
  await ensureCmsSchema();
  await getDatabasePool().execute(`DELETE FROM ${tableByKind[kind]}`);
}

export async function replaceCmsCategory<T>(kind: CmsKind, records: { key: string; data: T; sortOrder: number }[]) {
  await ensureCmsSchema();
  const connection = await getDatabasePool().getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute(`DELETE FROM ${tableByKind[kind]}`);
    for (const record of records) {
      await writeCmsRecord(
        (sql, values) => connection.execute(sql, values),
        kind,
        { ...record, published: true },
        "official",
        null,
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

export async function syncCmsCategory<T>(kind: CmsKind, records: { key: string; data: T; sortOrder: number }[]) {
  await ensureCmsSchema();
  const connection = await getDatabasePool().getConnection();

  try {
    await connection.beginTransaction();
    for (const record of records) {
      await writeCmsRecord(
        (sql, values) => connection.execute(sql, values),
        kind,
        { ...record, published: true },
        "official",
        null,
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

export async function getCmsSetting<T>(key: string): Promise<T | null> {
  if (key !== "site-content") return null;
  await ensureCmsSchema();
  const [contentRows] = await getDatabasePool().query<SiteContentRow[]>(
    "SELECT * FROM site_content WHERE content_id = 1 LIMIT 1",
  );
  if (!contentRows[0]) return null;
  const [milestoneRows] = await getDatabasePool().query<MilestoneRow[]>(
    "SELECT year_label, title, body FROM club_milestones WHERE content_id = 1 ORDER BY sort_order ASC, milestone_id ASC",
  );
  const row = contentRows[0];

  return {
    stripPrimary: row.strip_primary,
    stripSecondary: row.strip_secondary,
    heroKicker: row.hero_kicker,
    heroTitleTop: row.hero_title_top,
    heroTitleBottom: row.hero_title_bottom,
    heroLeadStrong: row.hero_lead_strong,
    heroLead: row.hero_lead,
    manifestoTitle: row.manifesto_title,
    manifestoCopy: row.manifesto_copy,
    clubIntroTitle: row.club_intro_title,
    clubIntroParagraphOne: row.club_intro_paragraph_one,
    clubIntroParagraphTwo: row.club_intro_paragraph_two,
    clubMilestones: milestoneRows.map((milestone) => ({
      year: milestone.year_label,
      title: milestone.title,
      copy: milestone.body,
    })),
    clubVenueTitle: row.club_venue_title,
    clubVenueCopy: row.club_venue_copy,
    footerStatement: row.footer_statement,
    instagramUrl: row.instagram_url,
    youtubeUrl: row.youtube_url,
  } as T;
}

export async function getCmsSettingSafe<T>(key: string): Promise<T | null> {
  if (!isCmsDatabaseConfigured()) return null;

  try {
    return await getCmsSetting<T>(key);
  } catch (error) {
    console.error(`[CMS] Lecture impossible pour le réglage ${key}`, error);
    return null;
  }
}

export async function saveCmsSetting<T>(key: string, data: T, actorAdminId: number | null = null) {
  if (key !== "site-content") throw new Error(`Réglage CMS inconnu : ${key}`);
  await ensureCmsSchema();
  const connection = await getDatabasePool().getConnection();

  try {
    await connection.beginTransaction();
    await writeSiteContent(connection, data as SiteContent, actorAdminId, false);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getCmsCounts() {
  await ensureCmsSchema();
  const pool = getDatabasePool();
  const entries = await Promise.all(
    cmsKinds.map(async (kind) => {
      const [rows] = await pool.query<(RowDataPacket & { total: number })[]>(
        `SELECT COUNT(*) AS total FROM ${tableByKind[kind]}`,
      );
      return [kind, Number(rows[0]?.total || 0)] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<CmsKind, number>;
}

export async function getCmsCountsSafe() {
  if (!isCmsDatabaseConfigured()) {
    return Object.fromEntries(cmsKinds.map((kind) => [kind, 0])) as Record<CmsKind, number>;
  }

  try {
    return await getCmsCounts();
  } catch (error) {
    console.error("[CMS] Comptage impossible", error);
    return Object.fromEntries(cmsKinds.map((kind) => [kind, 0])) as Record<CmsKind, number>;
  }
}

export async function checkCmsConnection() {
  if (!isCmsDatabaseConfigured()) return false;

  try {
    await ensureCmsSchema();
    await getDatabasePool().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
