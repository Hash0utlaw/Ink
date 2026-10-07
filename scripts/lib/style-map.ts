// scripts/lib/style-map.ts
// The cached raw-specialty → canonical-style decisions in data/style-map.json,
// shared by normalize-styles.ts (which builds it) and promote-shop-artists.ts
// (which reads it, never calling the AI).
//
// Each entry is keyed by the raw specialty value exactly as stored:
//   { "result": ["realism", "black-and-grey"] | "generic" | "non_tattoo" | "unknown",
//     "source": "rule" | "ai" | "manual" }
// Precedence: "manual" (a hand edit — set "source": "manual" to make it
// stick) > the rules in lib/styles.ts (recomputed every run, so improved
// synonyms take effect without editing the file) > a cached "ai" decision.

import fs from "fs"
import path from "path"
import { matchStyleSlugs, sortStyleSlugs, isStyleSlug, type StyleSlug } from "../../lib/styles"

export const STYLE_MAP_FILE = path.resolve("data/style-map.json")

export const CATEGORIES = ["generic", "non_tattoo", "unknown"] as const
export type StyleCategory = (typeof CATEGORIES)[number]
export type StyleResult = StyleSlug[] | StyleCategory
export type StyleSource = "rule" | "ai" | "manual"
export interface StyleMapEntry {
  result: StyleResult
  source: StyleSource
}
export type StyleMap = Record<string, StyleMapEntry>

export function isValidResult(r: unknown): r is StyleResult {
  if (typeof r === "string") return (CATEGORIES as readonly string[]).includes(r)
  return Array.isArray(r) && r.length > 0 && r.every(isStyleSlug)
}

export function loadStyleMap(): StyleMap {
  if (!fs.existsSync(STYLE_MAP_FILE)) return {}
  const parsed = JSON.parse(fs.readFileSync(STYLE_MAP_FILE, "utf-8")) as { entries?: StyleMap }
  const out: StyleMap = {}
  for (const [raw, entry] of Object.entries(parsed.entries ?? {})) {
    if (entry && isValidResult(entry.result)) out[raw] = entry
  }
  return out
}

// Sorted keys so diffs of the file stay readable. Written atomically.
export function saveStyleMap(map: StyleMap): void {
  const entries: StyleMap = {}
  for (const k of Object.keys(map).sort((a, b) => a.localeCompare(b))) entries[k] = map[k]
  fs.mkdirSync(path.dirname(STYLE_MAP_FILE), { recursive: true })
  const tmp = `${STYLE_MAP_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify({ updatedAt: new Date().toISOString(), entries }, null, 2) + "\n")
  fs.renameSync(tmp, STYLE_MAP_FILE)
}

/**
 * The decision for one raw value: a manual entry, else the rule match, else a
 * cached AI decision, else null (not decided — the caller may ask the AI or skip it).
 */
export function resolveValue(raw: string, map: StyleMap): StyleMapEntry | null {
  const cached = map[raw]
  if (cached?.source === "manual") return cached
  const slugs = matchStyleSlugs(raw)
  if (slugs.length > 0) return { result: slugs, source: "rule" }
  return cached?.source === "ai" ? cached : null
}

/** Canonical styles for a list of raw values. Undecided, generic, non_tattoo and unknown add nothing. */
export function stylesFor(values: readonly string[] | null | undefined, map: StyleMap): StyleSlug[] {
  const slugs: string[] = []
  for (const v of values ?? []) {
    const raw = v.trim()
    if (!raw) continue
    const entry = resolveValue(raw, map)
    if (entry && Array.isArray(entry.result)) slugs.push(...entry.result)
  }
  return sortStyleSlugs(slugs)
}
