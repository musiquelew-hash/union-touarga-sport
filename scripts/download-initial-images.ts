import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getOfficialCmsSeedData } from "../src/lib/official-cms-source";

type ImageKind = "player" | "staff" | "news" | "media";
type ImageManifest = Record<ImageKind, Record<string, string>>;

const outputDirectory = path.join(process.cwd(), "public", "content-images");
const manifestPath = path.join(process.cwd(), "src", "data", "initial-image-manifest.json");
const downloads = new Map<string, Promise<string>>();

function extensionFor(url: string, contentType: string | null) {
  const byContentType: Record<string, string> = {
    "image/avif": ".avif",
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  const mediaType = contentType?.split(";")[0].toLowerCase() || "";
  if (byContentType[mediaType]) return byContentType[mediaType];

  const extension = path.extname(new URL(url).pathname).toLowerCase();
  return [".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"].includes(extension) ? extension : ".jpg";
}

async function downloadImage(url: string) {
  const cached = downloads.get(url);
  if (cached) return cached;

  const download = (async () => {
    const response = await fetch(url, {
      headers: { Accept: "image/*", "User-Agent": "UTS-Site/1.0" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Image indisponible (${response.status}) : ${url}`);

    const body = Buffer.from(await response.arrayBuffer());
    const digest = createHash("sha256").update(body).digest("hex").slice(0, 20);
    const filename = `${digest}${extensionFor(url, response.headers.get("content-type"))}`;
    const destination = path.join(outputDirectory, filename);
    try {
      await access(destination);
    } catch {
      await writeFile(destination, body);
    }
    return `/content-images/${filename}`;
  })();

  downloads.set(url, download);
  return download;
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });
  const data = await getOfficialCmsSeedData();
  const manifest: ImageManifest = { player: {}, staff: {}, news: {}, media: {} };
  const collections = [
    ["player", data.players.map((item) => ({ id: String(item.id), url: item.imageUrl }))],
    ["staff", data.staff.map((item) => ({ id: String(item.id), url: item.imageUrl }))],
    ["news", data.news.map((item) => ({ id: String(item.id), url: item.imageUrl }))],
    ["media", data.media.map((item) => ({ id: item.id, url: item.thumbnailUrl }))],
  ] as const;

  for (const [kind, items] of collections) {
    for (const item of items) {
      if (!item.url) continue;
      manifest[kind][item.id] = await downloadImage(item.url);
    }
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const total = Object.values(manifest).reduce((sum, collection) => sum + Object.keys(collection).length, 0);
  console.log(`${total} références d’images enregistrées, ${downloads.size} fichiers locaux uniques.`);
}

main().catch((error) => {
  console.error("Téléchargement des images impossible.", error);
  process.exitCode = 1;
});