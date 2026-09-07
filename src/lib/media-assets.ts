import "server-only";

import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { ensureDatabaseSchema, getDatabasePool } from "@/lib/database";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const signatures = [
  { mimeType: "image/jpeg", matches: (bytes: Buffer) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { mimeType: "image/png", matches: (bytes: Buffer) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mimeType: "image/gif", matches: (bytes: Buffer) => ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii")) },
  { mimeType: "image/webp", matches: (bytes: Buffer) => bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP" },
] as const;

export class ImageUploadError extends Error {}

function detectedMimeType(bytes: Buffer) {
  return signatures.find((signature) => signature.matches(bytes))?.mimeType;
}

export async function saveUploadedImage(file: File, adminUserId: number | null) {
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new ImageUploadError("L’image doit peser moins de 8 Mo.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = detectedMimeType(bytes);
  if (!mimeType) {
    throw new ImageUploadError("Formats acceptés : JPG, PNG, WebP et GIF.");
  }

  await ensureDatabaseSchema();
  const assetId = randomUUID();
  await getDatabasePool().execute(
    `INSERT INTO media_assets (
      asset_id, file_name, mime_type, byte_size, image_data, created_by_admin_id
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [assetId, file.name.slice(0, 255) || "image", mimeType, bytes.length, bytes, adminUserId],
  );
  return `/api/media-assets/${assetId}`;
}

export async function resolveImageField(formData: FormData, fieldName: string, adminUserId: number) {
  const upload = formData.get(`${fieldName}Upload`);
  if (upload instanceof File && upload.size > 0) return saveUploadedImage(upload, adminUserId);
  return String(formData.get(fieldName) || "").trim();
}

export async function deleteUploadedImage(imageUrl: string) {
  const assetId = imageUrl.match(/^\/api\/media-assets\/([0-9a-f-]{36})$/i)?.[1];
  if (!assetId) return;
  await ensureDatabaseSchema();
  await getDatabasePool().execute("DELETE FROM media_assets WHERE asset_id = ?", [assetId]);
}

type MediaAssetRow = RowDataPacket & {
  mime_type: string;
  image_data: Buffer;
};

export async function getMediaAsset(assetId: string) {
  await ensureDatabaseSchema();
  const [rows] = await getDatabasePool().query<MediaAssetRow[]>(
    "SELECT mime_type, image_data FROM media_assets WHERE asset_id = ? LIMIT 1",
    [assetId],
  );
  return rows[0] || null;
}
