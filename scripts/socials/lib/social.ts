// scripts/socials/lib/social.ts
// Instagram, TikTok, Facebook and YouTube profile links: what counts as a
// profile, its canonical URL and a lowercase key to compare by. Anything that
// isn't a profile (posts, reels, videos, share and intent links, platform or
// theme defaults) returns null.

export type Platform = "instagram" | "tiktok" | "facebook" | "youtube"
export const PLATFORMS: Platform[] = ["instagram", "tiktok", "facebook", "youtube"]

export interface SocialProfile {
  platform: Platform
  /** Lowercase key: the handle, page name, or "channel/<id>". */
  key: string
  /** Canonical profile URL. */
  url: string
  /** The handle or page name as written (for comparing with the shop name). */
  name: string
}

// Platform and website-builder accounts that site themes link by default, and
// template placeholders ("yourusername").
const DEFAULT_ACCOUNTS = new Set([
  "instagram", "facebook", "tiktok", "youtube", "meta", "fb", "twitter", "x", "google", "yelp",
  "wix", "wixcom", "wixwebsites", "squarespace", "godaddy", "shopify", "weebly", "wordpress", "wordpressdotcom",
  "mailchimp", "envato", "themeforest", "elementor", "divi", "elegantthemes", "webflow", "jimdo", "strikingly",
  "duda", "hostgator", "bluehost", "vistaprint", "yola", "site123", "carrd", "linktree", "linktr.ee",
  "vagaro", "booksy", "square", "squareup", "tattoodo", "user", "username", "profile", "page", "pages", "home",
  "example", "sample", "demo", "test", "placeholder", "account", "yourname", "name", "company", "business",
  // Hosting and site-builder defaults ("facebook.com/Plesk" on an unconfigured server).
  "plesk", "cpanel", "hostinger", "ionos", "1and1", "siteground", "dreamhost", "namecheap", "a2hosting", "inmotionhosting",
  "webador", "canva", "zyro", "durable", "wixstudio", "networksolutions", "web.com", "yolasite", "homestead", "websitebuilder",
])
// Theme and template makers ("digitart_themes", "themerex_net") and video hosts.
const THEME = /themes?([._-]|$)|^themerex|templates?$|^vimeo$|^dribbble$|^behance$/
const PLACEHOLDER = /^(your|my|the)?[._-]?(user[._-]?name|handle|page|account|company|business|profile|channel|brand|name)s?$|^your[._-]?(user|name|handle|page|account|company|business|profile|channel|brand|site|shop|studio|ig|insta|instagram|facebook|fb|tiktok|youtube)|example|placeholder|lorem[._-]?ipsum/

const IG_RESERVED = new Set([
  "p", "reel", "reels", "tv", "explore", "stories", "accounts", "direct", "about", "legal", "developer", "share",
  "web", "s", "invites", "challenge", "emails", "ar", "privacy", "terms", "help", "press", "api", "oauth",
])
const FB_RESERVED = new Set([
  "sharer", "sharer.php", "share", "share.php", "dialog", "plugins", "groups", "events", "event", "photo", "photo.php",
  "photos", "watch", "story.php", "login", "login.php", "tr", "policies", "privacy", "help", "hashtag", "business",
  "ads", "marketplace", "gaming", "l.php", "home.php", "permalink.php", "media", "notes", "legal", "settings",
  "messages", "friends", "search", "reel", "reels", "video.php", "videos", "watch.php", "fundraisers", "pg",
  "profile", "page", "public", "recover", "r.php", "campaign", "places", "bookmarks", "stories", "badges", "terms",
])
const YT_RESERVED = new Set(["watch", "embed", "shorts", "playlist", "results", "feed", "live", "redirect", "attribution_link", "t", "v", "about", "premium", "kids", "account", "signin", "hashtag", "post", "clip", "music"])

function parse(raw: string): URL | null {
  const s = raw.trim()
  if (!s || /^(mailto|tel|javascript|sms):/i.test(s)) return null
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : s.startsWith("//") ? `https:${s}` : `https://${s}`)
  } catch {
    return null
  }
}

const isDefault = (key: string) => DEFAULT_ACCOUNTS.has(key) || PLACEHOLDER.test(key) || THEME.test(key) || (/^\d+$/.test(key) && key.length < 4)

/** The profile a URL points at, or null if it isn't a profile. */
export function socialProfile(raw: string): SocialProfile | null {
  const u = parse(raw)
  if (!u) return null
  const host = u.hostname.toLowerCase().replace(/^(www|m|mobile|web)\./, "")
  let segs: string[]
  try {
    segs = decodeURIComponent(u.pathname).split("/").filter(Boolean)
  } catch {
    return null
  }

  if (host === "instagram.com" || host === "instagr.am") {
    if (segs.length !== 1) return null
    const name = segs[0].replace(/^@/, "")
    const key = name.toLowerCase().replace(/\.+$/, "")
    if (!/^[a-z0-9._]{1,30}$/.test(key) || IG_RESERVED.has(key) || isDefault(key)) return null
    return { platform: "instagram", key, url: `https://www.instagram.com/${key}`, name }
  }

  if (host === "tiktok.com") {
    if (segs.length !== 1 || !segs[0].startsWith("@")) return null
    const name = segs[0].slice(1)
    const key = name.toLowerCase()
    if (!/^[a-z0-9._]{2,24}$/.test(key) || isDefault(key)) return null
    return { platform: "tiktok", key, url: `https://www.tiktok.com/@${key}`, name }
  }

  if (host === "facebook.com" || host === "fb.com") {
    if (segs.length === 1 && segs[0].toLowerCase() === "profile.php") {
      const id = u.searchParams.get("id")
      return id && /^\d{5,}$/.test(id) ? { platform: "facebook", key: `id:${id}`, url: `https://www.facebook.com/profile.php?id=${id}`, name: "" } : null
    }
    if ((segs[0] === "pages" || segs[0] === "people") && segs.length === 3 && /^\d{5,}$/.test(segs[2])) {
      if (segs[1].toLowerCase() === "category") return null
      return { platform: "facebook", key: `id:${segs[2]}`, url: `https://www.facebook.com/${segs.map(encodeURIComponent).join("/")}`, name: segs[1].replace(/-/g, " ") }
    }
    if (segs.length !== 1) return null
    const name = segs[0]
    const key = name.toLowerCase()
    if (!/^[a-z0-9.\-]{2,80}$/.test(key) || FB_RESERVED.has(key) || key.endsWith(".php") || isDefault(key)) return null
    return { platform: "facebook", key, url: `https://www.facebook.com/${name}`, name }
  }

  if (host === "youtube.com") {
    if (segs.length === 1 && segs[0].startsWith("@")) {
      const name = segs[0].slice(1)
      const key = name.toLowerCase()
      if (!/^[a-z0-9._-]{3,30}$/.test(key) || isDefault(key)) return null
      return { platform: "youtube", key: `@${key}`, url: `https://www.youtube.com/@${name}`, name }
    }
    if (segs.length === 2 && ["channel", "c", "user"].includes(segs[0])) {
      const name = segs[1]
      if (segs[0] === "channel" && !/^UC[A-Za-z0-9_-]{20,}$/.test(name)) return null
      const key = `${segs[0]}/${segs[0] === "channel" ? name : name.toLowerCase()}`
      if (segs[0] !== "channel" && (isDefault(name.toLowerCase()) || YT_RESERVED.has(name.toLowerCase()))) return null
      return { platform: "youtube", key, url: `https://www.youtube.com/${segs[0]}/${name}`, name: segs[0] === "channel" ? "" : name }
    }
    if (segs.length === 1 && !YT_RESERVED.has(segs[0].toLowerCase()) && /^[A-Za-z0-9_-]{3,40}$/.test(segs[0]) && !isDefault(segs[0].toLowerCase())) {
      // Legacy custom URL: youtube.com/<name>
      return { platform: "youtube", key: `c/${segs[0].toLowerCase()}`, url: `https://www.youtube.com/${segs[0]}`, name: segs[0] }
    }
    return null
  }
  return null
}

/** The platform a URL belongs to (profile or not), for counting ignored links. */
export function socialHost(raw: string): Platform | null {
  const u = parse(raw)
  if (!u) return null
  const host = u.hostname.toLowerCase().replace(/^(www|m|mobile|web)\./, "")
  if (host === "instagram.com" || host === "instagr.am") return "instagram"
  if (host === "tiktok.com") return "tiktok"
  if (host === "facebook.com" || host === "fb.com") return "facebook"
  if (host === "youtube.com" || host === "youtu.be") return "youtube"
  return null
}
