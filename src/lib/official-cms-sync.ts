import { cmsKinds, replaceCmsCategory, syncCmsCategory, type CmsKind } from "@/lib/relational-cms-db";
import { getOfficialCmsSeedData, type OfficialCmsSeedData } from "@/lib/official-cms-source";

const FETCH_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1_000;

export class OfficialCmsSyncError extends Error {
  constructor(public readonly failedKinds: CmsKind[]) {
    super(`Synchronisation officielle impossible pour : ${failedKinds.join(", ")}`);
    this.name = "OfficialCmsSyncError";
  }
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
      return data.players.map((item, index) => ({ key: String(item.id), data: item, sortOrder: index }));
    case "staff":
      return data.staff.map((item, index) => ({ key: String(item.id), data: item, sortOrder: index }));
    case "news":
      return data.news.map((item, index) => ({ key: String(item.id), data: item, sortOrder: index }));
    case "media":
      return data.media.map((item, index) => ({ key: item.id, data: item, sortOrder: index }));
  }
}

export async function replaceOfficialCmsCategory(kind: CmsKind) {
  const data = await fetchOfficialCmsSeedData();
  await replaceCmsCategory<unknown>(kind, officialRecordsForKind(kind, data));
}

export async function replaceAllOfficialCmsData() {
  const data = await fetchOfficialCmsSeedData();
  for (const kind of cmsKinds) {
    await replaceCmsCategory<unknown>(kind, officialRecordsForKind(kind, data));
  }
}

export async function syncAllOfficialCmsData() {
  const synchronized = Object.fromEntries(cmsKinds.map((kind) => [kind, 0])) as Record<CmsKind, number>;
  const results = await Promise.allSettled(
    cmsKinds.map(async (kind) => {
      const data = await fetchOfficialCmsSeedData();
      const records = officialRecordsForKind(kind, data);
      await syncCmsCategory<unknown>(kind, records);
      synchronized[kind] = records.length;
      return kind;
    }),
  );
  const failedKinds = results.flatMap((result, index) => {
    if (result.status === "fulfilled") return [];
    const kind = cmsKinds[index];
    console.warn(`[CMS] Synchronisation ${kind} ignorée après plusieurs tentatives.`, result.reason);
    return [kind];
  });

  if (failedKinds.length === cmsKinds.length) {
    throw new OfficialCmsSyncError(failedKinds);
  }

  return synchronized;
}
