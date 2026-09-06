import Image from "next/image";
import Link from "next/link";

export const UTS_CREST_URL = "/uts/crest-white.png";

export function Brand({
  compact = false,
  crestOnly = false,
  crestUrl = UTS_CREST_URL,
}: {
  compact?: boolean;
  crestOnly?: boolean;
  crestUrl?: string;
}) {
  return (
    <Link className={`brand${compact ? " brand--compact" : ""}`} href="/" aria-label="Accueil UTS">
      <span className="brand__crest">
        <Image src={crestUrl} alt="Écusson de l'Union Touarga Sport" width={56} height={56} priority />
      </span>
      <span className="brand__wordmark">
        {!crestOnly && <strong>UTS</strong>}
        {!compact && <small>Union Touarga Sport</small>}
      </span>
    </Link>
  );
}