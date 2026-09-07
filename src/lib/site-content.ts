import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getCmsSettingSafe } from "@/lib/relational-cms-db";
import { defaultSiteContent, type SiteContent } from "@/lib/site-content-defaults";

export { defaultSiteContent, type SiteContent } from "@/lib/site-content-defaults";

const getCachedSiteContent = unstable_cache(async function getCachedSiteContent(): Promise<SiteContent> {
  const stored = await getCmsSettingSafe<Partial<SiteContent>>("site-content");
  return { ...defaultSiteContent, ...stored };
}, ["site-content"], { revalidate: 300, tags: ["site-content"] });

export const getSiteContent = cache(getCachedSiteContent);