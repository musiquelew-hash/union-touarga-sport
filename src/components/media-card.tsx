import { Play } from "lucide-react";
import type { CSSProperties } from "react";
import type { MediaSummary } from "@/lib/uts-data";
import { formatDate } from "@/lib/format";

export function MediaCard({ media, featured = false }: { media: MediaSummary; featured?: boolean }) {
  const style = media.thumbnailUrl
    ? ({ "--media-image": `url("${media.thumbnailUrl}")` } as CSSProperties)
    : undefined;

  return (
    <a
      className={`media-card${featured ? " media-card--featured" : ""}`}
      href={media.url}
      target="_blank"
      rel="noreferrer"
      style={style}
    >
      <span className="media-card__visual" aria-hidden="true">
        <span className="media-card__play"><Play fill="currentColor" size={20} /></span>
      </span>
      <span className="media-card__content">
        <small>{media.timestamp ? formatDate(media.timestamp) : "Vidéo"}</small>
        <strong>{media.title}</strong>
      </span>
    </a>
  );
}