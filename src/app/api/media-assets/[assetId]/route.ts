import { getMediaAsset } from "@/lib/media-assets";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) return new Response(null, { status: 404 });

  const asset = await getMediaAsset(assetId);
  if (!asset) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(asset.image_data), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": asset.mime_type,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
