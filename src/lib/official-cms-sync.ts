import {
  cmsKinds,
  getCmsCategory,
  insertMissingOfficialCmsRecords,
  replaceCmsCategory,
  type CmsKind,
} from "@/lib/relational-cms-db";
import { getOfficialCmsSeedData, type OfficialCmsSeedData } from "@/lib/official-cms-source";
import initialImageManifest from "@/data/initial-image-manifest.json";

const FETCH_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1_000;
const localImages = initialImageManifest as Record<CmsKind, Record<string, string>>;

function localImage(kind: CmsKind, key: string, fallback: string | null) {
  return localImages[kind][key] || fallback;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchOfficialCmsSeedData() {
  let lastError: unknown;

  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    try {
      return await getOfficialCmsSeedData();
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_ATTEMPTS) await delay(RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError;
}

export function officialRecordsForKind(kind: CmsKind, data: OfficialCmsSeedData) {
  switch (kind) {
    case "player":
      return data.players.map((item, index) => ({
        key: String(item.id),
        data: { ...item, imageUrl: localImage(kind, String(item.id), item.imageUrl) || "" },
        sortOrder: index,
      }));
    case "staff":
      return data.staff.map((item, index) => ({
        key: String(item.id),
        data: { ...item, imageUrl: localImage(kind, String(item.id), item.imageUrl) || "" },
        sortOrder: index,
      }));
    case "news":
      return data.news.map((item, index) => ({
        key: String(item.id),
        data: { ...item, imageUrl: localImage(kind, String(item.id), item.imageUrl) },
        sortOrder: index,
      }));
    case "media":
      return data.media.map((item, index) => ({
        key: item.id,
        data: { ...item, thumbnailUrl: localImage(kind, item.id, item.thumbnailUrl) },
        sortOrder: index,
      }));
  }
}

export async function replaceAllOfficialCmsData() {
  const data = await fetchOfficialCmsSeedData();
  const counts = Object.fromEntries(cmsKinds.map((kind) => [kind, 0])) as Record<CmsKind, number>;

  for (const kind of cmsKinds) {
    const records: { key: string; data: unknown; sortOrder: number }[] = officialRecordsForKind(kind, data);
    await replaceCmsCategory<unknown>(kind, records);
    counts[kind] = records.length;
  }

  return counts;
}

export async function restoreMissingOfficialCmsData() {
  const data = await fetchOfficialCmsSeedData();
  const counts = Object.fromEntries(cmsKinds.map((kind) => [kind, 0])) as Record<CmsKind, number>;

  for (const kind of cmsKinds) {
    const records: { key: string; data: unknown; sortOrder: number }[] = officialRecordsForKind(kind, data);
    const existing = await getCmsCategory<unknown>(kind, true);
    const existingKeys = new Set(existing.records.map((record) => record.key));
    const missing = records.filter((record) => !existingKeys.has(record.key));
    await insertMissingOfficialCmsRecords(kind, missing);
    counts[kind] = missing.length;
  }

  return counts;
}
