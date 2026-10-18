// scripts/ig/lib.ts
// Shared by scripts/ig/*: Meta Graph API calls (tokens never printed), the
// .env.local writer, username normalization and the follower cache file.

import fs from "fs"
import path from "path"
import { socialProfile } from "../socials/lib/social"

export const ENV_FILE = path.resolve(".env.local")
export const CACHE_FILE = path.resolve("data/cache/ig-followers.jsonl")
export const USAGE_FILE = path.resolve("data/cache/ig-usage.jsonl")
export const REPORT_DIR = path.resolve("data/reports")
export const GRAPH = "https://graph.facebook.com"

// Every secret we load; any of them showing up in a message gets masked.
const SECRET_KEYS = ["META_APP_SECRET", "META_USER_TOKEN", "META_LONG_TOKEN"]

export function redact(s: string): string {
  let out = s
  for (const k of SECRET_KEYS) {
    const v = process.env[k]
    if (v && v.length > 8) out = out.split(v).join(`<${k}>`)
  }
  return out.replace(/access_token=[^&\s"]+/g, "access_token=<redacted>").replace(/client_secret=[^&\s"]+/g, "client_secret=<redacted>")
}

export function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) {
    console.error(`Missing ${name} in .env.local.`)
    process.exit(1)
  }
  return v
}

/** Sets KEY=value in .env.local, replacing an existing line or appending one. */
export function setEnvVar(key: string, value: string): void {
  const text = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf-8") : ""
  const line = `${key}=${value}`
  const re = new RegExp(`^${key}=.*$`, "m")
  const next = re.test(text) ? text.replace(re, line) : `${text}${text && !text.endsWith("\n") ? "\n" : ""}${line}\n`
  fs.writeFileSync(ENV_FILE, next, { mode: 0o600 })
  process.env[key] = value
}

export interface GraphError {
  message: string
  type?: string
  code?: number
  error_subcode?: number
  error_user_title?: string
  error_user_msg?: string
}

export interface GraphResult<T> {
  status: number
  body: (T & { error?: undefined }) | { error: GraphError }
  headers: Headers
}

/** GET a Graph API path. `params` may include access_token; nothing here is logged. */
export async function graphGet<T>(pathAndVersion: string, params: Record<string, string>): Promise<GraphResult<T>> {
  const url = `${GRAPH}/${pathAndVersion.replace(/^\//, "")}?${new URLSearchParams(params)}`
  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  } catch (e) {
    throw new Error(redact(`network error: ${(e as Error).message}`))
  }
  const text = await res.text()
  let body: GraphResult<T>["body"]
  try {
    body = JSON.parse(text)
  } catch {
    body = { error: { message: `HTTP ${res.status}, not JSON: ${redact(text.slice(0, 200))}` } }
  }
  if (body && "error" in body && body.error) body.error.message = redact(body.error.message ?? "")
  return { status: res.status, body, headers: res.headers }
}

// ---- usernames -------------------------------------------------------------

/**
 * Bare lowercase Instagram username from a handle or profile URL, or null when
 * it isn't a profile (/p/, /reel/, /explore/, /stories/, platform defaults,
 * "View Instagram" and other junk).
 */
export function igUsername(raw: unknown): string | null {
  const s = String(raw ?? "").trim()
  if (!s) return null
  if (/instagr(\.am|am\.com)/i.test(s)) return socialProfile(s)?.key ?? null
  const bare = s.replace(/^@/, "")
  if (!/^[A-Za-z0-9._]+$/.test(bare)) return null
  return socialProfile(`https://www.instagram.com/${bare}`)?.key ?? null
}

// ---- cache -----------------------------------------------------------------

export type Status = "ok" | "not_business" | "invalid_username" | "rate_limited" | "other_error"
/** Results that won't change on a retry; the others are looked up again on re-run. */
export const FINAL: Set<Status> = new Set(["ok", "not_business", "invalid_username"])

export interface CacheRow {
  username: string
  status: Status
  followers_count?: number
  media_count?: number
  ig_username?: string
  error_code?: number
  error_subcode?: number
  message?: string
  fetched_at: string
}

/** Latest cache row per username. */
export function readCache(): Map<string, CacheRow> {
  const out = new Map<string, CacheRow>()
  if (!fs.existsSync(CACHE_FILE)) return out
  for (const line of fs.readFileSync(CACHE_FILE, "utf-8").split("\n")) {
    if (!line.trim()) continue
    try {
      const r = JSON.parse(line) as CacheRow
      out.set(r.username, r)
    } catch {
      // a half-written last line from a killed run
    }
  }
  return out
}

export function appendCache(row: CacheRow): void {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true })
  fs.appendFileSync(CACHE_FILE, JSON.stringify(row) + "\n")
}
