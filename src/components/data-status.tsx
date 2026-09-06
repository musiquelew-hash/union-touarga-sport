import { Radio } from "lucide-react";
import type { UtsData } from "@/lib/uts-data";
import { formatUpdatedAt } from "@/lib/format";

const statusLabels: Record<UtsData["freshness"], string> = {
  live: "Données à jour",
  partial: "Mise à jour partielle",
  fallback: "Dernières données connues",
};

export function DataStatus({ data, inverse = false }: { data: UtsData; inverse?: boolean }) {
  return (
    <span className={`data-status data-status--${data.freshness}${inverse ? " data-status--inverse" : ""}`}>
      <Radio aria-hidden="true" size={14} />
      {statusLabels[data.freshness]} · {formatUpdatedAt(data.updatedAt)}
    </span>
  );
}