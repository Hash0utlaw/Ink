import { SITE_URL } from "@/lib/site-config"
import { escapeHtml } from "@/lib/escape-html"

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

export function claimUrl(artist: Pick<IntroArtist, "handle">): string {
  return artist.handle ? `${SITE_URL}/claim?artist=${encodeURIComponent(artist.handle)}` : `${SITE_URL}/claim`
}

export function shopAddress(shop: IntroShop | null): string {
  if (!shop) return ""
  const cityLine = [shop.city, [shop.state, shop.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")
  return [shop.address, cityLine].filter(Boolean).join(", ")
}

/** Ready-to-copy message for the shop. Never includes the client's name, email or phone. */
export function buildOutreachMessage(artist: IntroArtist, request: Pick<IntroRequest, "size" | "placement" | "style">) {
  const shop = introShop(artist)
  const firstName = artist.display_name?.trim().split(/\s+/)[0] || "your artist"
  const details = [request.size, request.placement, request.style].filter((v) => v && v.trim()).join(", ")

  return (
    `Hi ${shop?.name?.trim() || "there"}, a client found ${firstName} on TattooMaps and sent a tattoo request` +
    `${details ? ` (${details})` : ""}. ` +
    `${firstName} can see the details and reply for free by claiming their profile here: ${claimUrl(artist)}. ` +
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
  const location = [shop?.city, shop?.state].filter(Boolean).join(" ")
  const subject = `Intro request: ${artistName} at ${shop?.name ?? "no shop"}${location ? `, ${location}` : ""}`

  const row = (label: string, value: string | null | undefined) =>
    value ? `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>` : ""
  const link = (label: string, href: string | null, text?: string | null) =>
    href ? `<li>${label}: <a href="${escapeHtml(href)}">${escapeHtml(text ?? href)}</a></li>` : ""

  const contacts = [
    shop?.phone ? link("Phone", `tel:${shop.phone.replace(/[^\d+]/g, "")}`, shop.phone) : "",
    shop?.email ? link("Email", `mailto:${shop.email.trim()}`, shop.email) : "",
    link("Website", externalUrl(shop?.website)),
    link("Facebook", externalUrl(shop?.facebook_url)),
    link("Instagram", externalUrl(shop?.instagram_url)),
  ].join("")

  const html = `
    <h2>New intro request for ${escapeHtml(artistName)}</h2>
    ${row("Size", request.size)}
    ${row("Placement", request.placement)}
    ${row("Style", request.style)}
    ${row("Preferred date", request.preferredDate)}
    ${row("Description", request.description)}
    ${row("Submitted", new Date(request.createdAt).toUTCString())}
    <h3>Shop</h3>
    ${row("Name", shop?.name)}
    ${row("Address", shopAddress(shop))}
    ${contacts ? `<ul>${contacts}</ul>` : "<p>No contact details on file.</p>"}
    <h3>Outreach message</h3>
    <pre style="white-space:pre-wrap;font-family:inherit;background:#f4f4f5;padding:12px;border-radius:8px;">${escapeHtml(
      buildOutreachMessage(artist, request),
    )}</pre>
    <p><a href="${SITE_URL}/admin/intros">Open the intros dashboard →</a></p>
  `

  return { subject, html }
}
