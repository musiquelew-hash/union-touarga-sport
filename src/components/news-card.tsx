import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import type { NewsSummary } from "@/lib/uts-data";
import { formatDate } from "@/lib/format";

export function NewsCard({ article }: { article: NewsSummary }) {
  return (
    <a className="news-card" href={article.url} target="_blank" rel="noreferrer">
      <span className="news-card__visual">
        {article.imageUrl && (
          <Image
            src={article.imageUrl}
            alt={article.imageAlt}
            fill
            sizes="(max-width: 820px) 100vw, 33vw"
          />
        )}
        <span>Source officielle</span>
      </span>
      <span className="news-card__body">
        <small>{article.timestamp ? formatDate(article.timestamp) : "Actualité UTS"}</small>
        <strong>{article.title}</strong>
        <ArrowUpRight aria-hidden="true" size={20} />
      </span>
    </a>
  );
}