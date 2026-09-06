import "server-only";

import { cache } from "react";
import { getCmsSettingSafe } from "@/lib/relational-cms-db";
import { defaultSiteContent, type SiteContent } from "@/lib/site-content-defaults";

export { defaultSiteContent, type SiteContent } from "@/lib/site-content-defaults";

export const getSiteContent = cache(async function getSiteContent(): Promise<SiteContent> {
  const stored = await getCmsSettingSafe<Partial<SiteContent>>("site-content");
  return { ...defaultSiteContent, ...stored };
});