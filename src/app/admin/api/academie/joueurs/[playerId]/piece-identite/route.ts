import { requireAdmin } from "@/lib/admin-auth";
import { getAcademyIdentityDocument } from "@/lib/academy";

export async function GET(_request: Request, { params }: { params: Promise<{ playerId: string }> }) {
  await requireAdmin();
  const playerId = Number((await params).playerId);
  if (!Number.isInteger(playerId) || playerId <= 0) return new Response(null, { status: 404 });
  const document = await getAcademyIdentityDocument(playerId);
  if (!document) return new Response(null, { status: 404 });
  const fileName = document.name.replace(/["\r\n]/g, "");
  return new Response(new Uint8Array(document.bytes), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": document.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}