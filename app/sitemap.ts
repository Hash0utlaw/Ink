import type { MetadataRoute } from "next"
import { getAllCityStatePairs, getAllShopIds, getAllArtistIds } from "@/lib/supabase/seo"
import { STATE_ABBR_TO_NAME, stateAbbrToSlug, cityToSlug } from "@/lib/utils/states"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tattoo-maps.com"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cityPairs, shopIds, artistIds] = await Promise.all([
    getAllCityStatePairs(),
    getAllShopIds(),
    getAllArtistIds(),
  ])

  const now = new Date()

  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/artists`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/shops`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/flash`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/find-artist`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/tattoo-shops`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/map`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
  ]

  // State pages — one per state
  const stateRoutes: MetadataRoute.Sitemap = Object.keys(STATE_ABBR_TO_NAME).map((abbr) => ({
    url: `${BASE_URL}/tattoo-shops/${stateAbbrToSlug(abbr)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  // City pages
  const cityRoutes: MetadataRoute.Sitemap = cityPairs.map(({ city, state }) => ({
    url: `${BASE_URL}/tattoo-shops/${stateAbbrToSlug(state)}/${cityToSlug(city)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  // Shop pages
  const shopRoutes: MetadataRoute.Sitemap = shopIds.map((id) => ({
    url: `${BASE_URL}/shops/${id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  // Artist pages
  const artistRoutes: MetadataRoute.Sitemap = artistIds.map((id) => ({
    url: `${BASE_URL}/artists/${id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  return [
    ...staticRoutes,
    ...stateRoutes,
    ...cityRoutes,
    ...shopRoutes,
    ...artistRoutes,
  ]
}
