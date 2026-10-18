import { EMAIL_SITE_URL, SITE_URL } from "@/lib/site-config"
import { introAlertEmail } from "@/lib/email/templates"

// Shared by the instant intro alert, the /admin/intros page and the daily digest.

export interface IntroShop {
  name: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  email: string | null
  website: string | null
  facebook_url: string | null
  instagram_url: string | null
}

export interface IntroArtist {
  id: string
  display_name: string | null
  handle: string | null
  shops: IntroShop | IntroShop[] | null
  // The artist's own links (INTRO_ARTIST_COLUMNS): the only way to reach an artist with no shop.
  instagram_handle?: string | null
  website_url?: string | null
  booking_url?: string | null
  city?: string | null
  state?: string | null
}

export interface IntroRequest {
  size: string | null
  placement: string | null
  style: string | null
  preferredDate: string | null
  description: string | null
  createdAt: string
}

export const INTRO_SHOP_COLUMNS =
  "name, address, city, state, zip, phone, email, website, facebook_url, instagram_url"
/** Artist columns for the intro alert and admin list (with id, display_name, handle). */
export const INTRO_ARTIST_COLUMNS = "instagram_handle, website_url, booking_url, city, state"

export function introShop(artist: IntroArtist): IntroShop | null {
  if (!artist.shops) return null
  return Array.isArray(artist.shops) ? artist.shops[0] ?? null : artist.shops
}

/** Prefix bare domains with https:// and drop anything that isn't http(s). */
export function externalUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(withScheme)
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null
  } catch {
    return null
  }
}

export function claimUrl(artist: Pick<IntroArtist, "handle">, base = SITE_URL): string {
  return artist.handle ? `${base}/claim?artist=${encodeURIComponent(artist.handle)}` : `${base}/claim`
}

export function shopAddress(shop: IntroShop | null): string {
  if (!shop) return ""
  const cityLine = [shop.city, [shop.state, shop.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")
  return [shop.address, cityLine].filter(Boolean).join(", ")
}

/** Ready-to-copy message for the shop. Never includes the client's name, email or phone. */
export function buildOutreachMessage(
  artist: IntroArtist,
  request: Pick<IntroRequest, "size" | "placement" | "style">,
  base = SITE_URL,
) {
  const shop = introShop(artist)
  const firstName = artist.display_name?.trim().split(/\s+/)[0] || "your artist"
  const details = [request.size, request.placement, request.style].filter((v) => v && v.trim()).join(", ")

  return (
    `Hi ${shop?.name?.trim() || "there"}, a client found ${firstName} on TattooMaps and sent a tattoo request` +
    `${details ? ` (${details})` : ""}. ` +
    `${firstName} can see the details and reply for free by claiming their profile here: ${claimUrl(artist, base)}. ` +
    `Adam, TattooMaps`
  )
}

export function buildOutreachMailto(artist: IntroArtist, request: Pick<IntroRequest, "size" | "placement" | "style">) {
  const shop = introShop(artist)
  const subject = `A tattoo request for ${artist.display_name ?? "your artist"} on TattooMaps`
  const params = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildOutreachMessage(artist, request))}`
  return `mailto:${shop?.email ? encodeURIComponent(shop.email.trim()) : ""}?${params}`
}

export function hoursSince(iso: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / (60 * 60 * 1000)))
}

export function buildIntroAlertEmail(artist: IntroArtist, request: IntroRequest) {
  const shop = introShop(artist)
  const artistName = artist.display_name || "Unknown artist"
  const location = [shop?.city ?? artist.city, shop?.state ?? artist.state].filter(Boolean).join(" ")
  const subject = `Intro request: ${artistName} at ${shop?.name ?? "no shop"}${location ? `, ${location}` : ""}`

  const contacts: [string, string, string][] = []
  const add = (label: string, href: string | null, text?: string | null) => {
    if (href) contacts.push([label, href, text ?? href])
  }
  if (shop?.phone) add("Phone", `tel:${shop.phone.replace(/[^\d+]/g, "")}`, shop.phone)
  if (shop?.email) add("Email", `mailto:${shop.email.trim()}`, shop.email)
  add("Website", externalUrl(shop?.website))
  add("Facebook", externalUrl(shop?.facebook_url))
  add("Instagram", externalUrl(shop?.instagram_url))
  // No shop (Round 11): the artist's own Instagram, website and booking link.
  if (!shop) {
    const ig = artist.instagram_handle?.trim().replace(/^@/, "")
    if (ig) add("Instagram", `https://www.instagram.com/${encodeURIComponent(ig)}`, `@${ig}`)
    add("Website", externalUrl(artist.website_url))
    add("Booking link", externalUrl(artist.booking_url))
  }

  return introAlertEmail({
    artistName,
    subject,
    request: { ...request, submitted: new Date(request.createdAt).toUTCString() },
    shop: { name: shop?.name, address: shopAddress(shop) },
    contacts,
    outreachMessage: buildOutreachMessage(artist, request, EMAIL_SITE_URL),
  })
}
