import type { MetadataRoute } from "next";

import { getJerseys, siteUrl } from "@/lib/catalog";

// Same per-request catalog as the pages, so a new jersey is listed right away.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const jerseys = await getJerseys();

  return [
    { url: siteUrl },
    { url: `${siteUrl}/contact` },
    ...jerseys.map((jersey) => ({ url: `${siteUrl}/maillots/${jersey.slug}` }))
  ];
}
