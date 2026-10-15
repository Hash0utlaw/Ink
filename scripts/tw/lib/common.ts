// scripts/tw/lib/common.ts
// Paths, flags and URL helpers shared by scripts/tw/{discover,fetch,match}.ts.

import fs from "fs"
import path from "path"

export const SITE = "https://tattooswizard.com"
export const TW_DIR = path.resolve("data/tw")
export const REPORT_DIR = path.resolve("data/reports")
export const URLS_FILE = path.join(TW_DIR, "urls.jsonl")
export const PROFILES_FILE = path.join(TW_DIR, "profiles.jsonl")

/** One US profile found by discover.ts. */
export interface UrlRow {
  url: string
  username: string
  in_sitemap: boolean
  in_us_listing: boolean
  listed_as_studio: boolean
  listing_name: string | null
  listing_place: string | null
  listing_position: number | null
}

const argv = process.argv.slice(2)

export function flag(name: string): boolean {
  return argv.includes(name)
}

export function option(name: string): string | null {
  const fused = argv.find((a) => a.startsWith(`${name}=`))
  if (fused !== undefined) return fused.slice(name.length + 1)
  const i = argv.indexOf(name)
  return i !== -1 && i + 1 < argv.length ? argv[i + 1] : null
}

export function numOption(name: string): number | null {
  const v = option(name)
  const n = v === null ? NaN : Number(v)
  return Number.isFinite(n) ? n : null
}

export function readJsonl<T>(file: string): T[] {
  if (!fs.existsSync(file)) return []
  return fs
    .readFileSync(file, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as T)
}

export function writeJsonl(file: string, rows: unknown[]): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""))
}

export function readJson<T>(file: string, fallback: T): T {
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf-8")) as T) : fallback
}

export function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(value, null, 2))
}

// Language prefixes the site uses ("/es/artists/x", "/zh-TW/artists/x").
const LANG_PREFIX = /^\/[a-z]{2}(?:-[A-Z]{2})?(?=\/)/

/**
 * Canonical English profile URL, or null if the URL isn't a profile.
 * Language variants collapse to the same URL: /ca/artists/foo → /artists/foo.
 */
export function canonicalProfileUrl(raw: string): string | null {
  let u: URL
  try {
    u = new URL(raw, SITE)
  } catch {
    return null
  }
  if (!/(^|\.)tattooswizard\.com$/.test(u.hostname) || u.hostname.startsWith("designs.")) return null
  const p = u.pathname.replace(LANG_PREFIX, "").replace(/\/+$/, "")
  const m = p.match(/^\/artists\/([^/]+)$/)
  if (!m) return null
  const username = decodeURIComponent(m[1]).toLowerCase()
  return `${SITE}/artists/${encodeURIComponent(username).replace(/%40/g, "@")}`
}

export function usernameOf(profileUrl: string): string {
  return decodeURIComponent(profileUrl.split("/artists/")[1] ?? "")
}
