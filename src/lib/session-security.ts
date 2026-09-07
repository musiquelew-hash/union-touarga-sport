import "server-only";

import { createHash } from "node:crypto";
import { getDatabaseUrl } from "@/lib/database";

export function getSessionSigningKey(scope: "admin" | "academy") {
  const source = process.env.ADMIN_SESSION_SECRET?.trim() || getDatabaseUrl();
  if (!source) return "";
  return createHash("sha256").update(`uts:${scope}:${source}`).digest("hex");
}