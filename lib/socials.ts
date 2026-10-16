// Social profile links for display: the Follow list on shop pages and the
// Instagram / TikTok buttons on artist pages. Stored URLs are canonical profile
// links (scripts/socials/import.ts); anything that isn't http(s) is dropped.

import { followersLabel } from "@/lib/format-count"

export type SocialNetwork = "instagram" | "tiktok" | "facebook" | "youtube"

export const NETWORK_LABEL: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
}

export interface SocialLink {
  network: SocialNetwork
  href: string
  /** "@meduzaink" for Instagram and TikTok, the page name for Facebook and YouTube. */
  label: string
  /** "Instagram, 12.4K followers" or "TikTok". */
  detail: string
}

// Crawl results that mean the shop's website doesn't work (website_status).
const BROKEN_WEBSITE = new Set(["dead", "parked", "not_found"])

/** The shop's website for display, or "" when the crawl found it dead, parked or not found. */
export function workingWebsite(shop: { website?: string | null; websiteStatus?: string | null }): string {
  if (shop.websiteStatus && BROKEN_WEBSITE.has(shop.websiteStatus)) return ""
  return shop.website?.trim() ?? ""
}

/** The URL when it's a usable http(s) link, else null. */
export function safeHttpUrl(raw: string | null | undefined): string | null {
  const s = raw?.trim()
  if (!s) return null
  try {
    const url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null
  } catch {
    return null
  }
}

/** The handle in an Instagram or TikTok profile URL ("meduzaink"), or null. */
export function handleFromUrl(network: "instagram" | "tiktok", raw: string | null | undefined): string | null {
  const href = safeHttpUrl(raw)
  if (!href) return null
  const first = new URL(href).pathname.split("/").filter(Boolean)[0] ?? ""
  const handle = decodeURIComponent(network === "tiktok" ? first.replace(/^@/, "") : first)
  return /^[\w.]{1,40}$/.test(handle) ? handle : null
}

/** A bare handle from "@name", "name" or a profile URL; null when it isn't one. */
export function cleanHandle(network: "instagram" | "tiktok", raw: string | null | undefined): string | null {
  const s = raw?.trim()
  if (!s) return null
  if (/[/:]/.test(s)) return handleFromUrl(network, s)
  const handle = s.replace(/^@/, "")
  return /^[\w.]{1,40}$/.test(handle) ? handle : null
}

export function profileUrl(network: "instagram" | "tiktok", handle: string): string {
  return network === "instagram" ? `https://www.instagram.com/${handle}/` : `https://www.tiktok.com/@${handle}`
}

/**
 * The shop's Follow rows, in Instagram, TikTok, Facebook, YouTube order, only
 * for the networks it has. A follower count only where we have a real one.
 */
export function shopSocialLinks(shop: {
  name: string
  instagramUrl?: string | null
  instagramFollowers?: number | null
  tiktokUrl?: string | null
  facebookUrl?: string | null
  youtubeUrl?: string | null
}): SocialLink[] {
  const links: SocialLink[] = []
  const add = (network: SocialNetwork, raw: string | null | undefined, followers?: number | null) => {
    const href = safeHttpUrl(raw)
    if (!href) return
    const handle = network === "instagram" || network === "tiktok" ? handleFromUrl(network, href) : null
    const count = followersLabel(followers)
    links.push({
      network,
      href,
      label: handle ? `@${handle}` : shop.name,
      detail: count ? `${NETWORK_LABEL[network]}, ${count}` : NETWORK_LABEL[network],
    })
  }
  add("instagram", shop.instagramUrl, shop.instagramFollowers)
  add("tiktok", shop.tiktokUrl)
  add("facebook", shop.facebookUrl)
  add("youtube", shop.youtubeUrl)
  return links
}
