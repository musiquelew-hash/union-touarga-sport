import { refreshAcademySession } from "@/lib/academy-auth";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return new Response(null, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  }
  const authenticated = await refreshAcademySession();
  return new Response(null, { status: authenticated ? 204 : 401, headers: { "Cache-Control": "private, no-store" } });
}