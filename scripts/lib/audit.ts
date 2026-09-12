// scripts/lib/audit.ts
// Shared, read-only coverage computation for scripts/audit-coverage.ts.
// Deliberately kept out of the CLI entrypoint so a future verify-import.ts
// (post-import diffing) can import the exact same computeReport() and get a
// structurally identical "after" report to diff against — no drift between
// two hand-written computations of the same thing.

import type { SupabaseClient } from "@supabase/supabase-js"
import { nearestMetro, TOP_50_METROS } from "./metros"

// ── Types ────────────────────────────────────────────────────────────────────

export interface ShopRow {
  id: string
  name: string | null
  slug: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  website: string | null
  latitude: number | null
  longitude: number | null
  place_id: string | null
  rating: number | null
  review_count: number | null
  hours: unknown
  description: string | null
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

export interface StateBucket {
  state: string
  total: number
  usable: number
  usablePct: number
}

export interface MetroBucket {
  rank: number
  name: string
  population: number
  usableShops: number
  belowThreshold: boolean
}

export interface DuplicateCluster {
  name: string
  address: string
  count: number
  placeIds: (string | null)[]
  shopIds: string[]
}

export interface FieldCompleteness {
  field: string
  populated: number
  total: number
  pct: number
}

export interface AuditReport {
  generatedAt: string
  totals: {
    totalShops: number
    usableShops: number
    usablePct: number
    distinctStateCodes: number
    nonStandardStateCodeCount: number
  }
  states: {
    buckets: StateBucket[] // all 50 + DC, sorted desc by total
    zeroCountStates: string[]
    nonStandardCodes: { code: string; count: number }[]
    noStateCount: number
  }
  metros: {
    buckets: MetroBucket[] // all 50, sorted by rank
    belowThreshold: MetroBucket[]
    outsideTopMetrosOrNoCoords: number
    metroThreshold: number
  }
  duplicates: {
    clusterCount: number
    duplicateRowCount: number
    sample: DuplicateCluster[]
  }
  completeness: FieldCompleteness[]
}

// ── Constants ────────────────────────────────────────────────────────────────

export const US_STATES_PLUS_DC = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
])

const METRO_USABLE_THRESHOLD = 15

// ── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`fetchAllRows(${table}): ${error.message}`)
    const page = (data ?? []) as unknown as T[]
    rows.push(...page)
    if (page.length < pageSize) break
    from += pageSize
  }
  return rows
}

// ── Usable definition (mirrors app/api/map/route.ts's lat/lng gate) ────────────

export function isUsable(shop: ShopRow, slugCounts: Map<string, number>): boolean {
  if (!shop.name || !shop.name.trim()) return false
  if (!shop.address) return false
  if (!shop.city) return false
  if (!shop.state || !US_STATES_PLUS_DC.has(shop.state.trim().toUpperCase())) return false
  if (shop.latitude == null || shop.latitude === 0) return false
  if (shop.longitude == null || shop.longitude === 0) return false
  if (!shop.slug) return false
  if ((slugCounts.get(shop.slug) ?? 0) !== 1) return false
  return true
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function isPopulated(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") return Object.keys(value as object).length > 0
  return true
}

// ── Compute ──────────────────────────────────────────────────────────────────

export function computeReport(shops: ShopRow[]): AuditReport {
  const slugCounts = new Map<string, number>()
  for (const shop of shops) {
    if (shop.slug) slugCounts.set(shop.slug, (slugCounts.get(shop.slug) ?? 0) + 1)
  }

  const usableFlags = shops.map((shop) => isUsable(shop, slugCounts))
  const usableShops = usableFlags.filter(Boolean).length

  // ── States ──
  const stateTotals = new Map<string, { total: number; usable: number }>()
  for (const code of US_STATES_PLUS_DC) stateTotals.set(code, { total: 0, usable: 0 })
  const nonStandard = new Map<string, number>()
  let noStateCount = 0

  shops.forEach((shop, i) => {
    const raw = shop.state?.trim().toUpperCase()
    if (!raw) {
      noStateCount++
      return
    }
    if (US_STATES_PLUS_DC.has(raw)) {
      const bucket = stateTotals.get(raw)!
      bucket.total++
      if (usableFlags[i]) bucket.usable++
    } else {
      nonStandard.set(raw, (nonStandard.get(raw) ?? 0) + 1)
    }
  })

  const stateBuckets: StateBucket[] = Array.from(stateTotals.entries())
    .map(([state, { total, usable }]) => ({
      state,
      total,
      usable,
      usablePct: total > 0 ? Math.round((usable / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total)

  const zeroCountStates = stateBuckets.filter((b) => b.total === 0).map((b) => b.state)
  const nonStandardCodes = Array.from(nonStandard.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)

  // ── Metros ──
  const metroUsableCounts = new Map<number, number>()
  for (const metro of TOP_50_METROS) metroUsableCounts.set(metro.rank, 0)
  let outsideTopMetrosOrNoCoords = 0

  shops.forEach((shop, i) => {
    if (!usableFlags[i]) {
      outsideTopMetrosOrNoCoords++
      return
    }
    const match = nearestMetro(shop.latitude as number, shop.longitude as number)
    if (match) {
      metroUsableCounts.set(match.metro.rank, (metroUsableCounts.get(match.metro.rank) ?? 0) + 1)
    } else {
      outsideTopMetrosOrNoCoords++
    }
  })

  const metroBuckets: MetroBucket[] = TOP_50_METROS.map((metro) => {
    const usable = metroUsableCounts.get(metro.rank) ?? 0
    return {
      rank: metro.rank,
      name: metro.name,
      population: metro.population,
      usableShops: usable,
      belowThreshold: usable < METRO_USABLE_THRESHOLD,
    }
  })
  const belowThreshold = metroBuckets.filter((m) => m.belowThreshold)

  // ── Duplicates: same normalized name + address, different place_id ──
  const groups = new Map<string, ShopRow[]>()
  for (const shop of shops) {
    if (!shop.name || !shop.address) continue
    const key = `${normalize(shop.name)}|${normalize(shop.address)}`
    if (!key.trim().replace("|", "")) continue
    const list = groups.get(key) ?? []
    list.push(shop)
    groups.set(key, list)
  }

  const clusters: DuplicateCluster[] = []
  for (const rows of groups.values()) {
    if (rows.length < 2) continue
    const placeIds = rows.map((r) => r.place_id)
    const distinct = new Set(placeIds.map((p) => p ?? "∅"))
    if (distinct.size < 2) continue // same/no place_id across the group — not a real duplicate signal
    clusters.push({
      name: rows[0].name ?? "",
      address: rows[0].address ?? "",
      count: rows.length,
      placeIds,
      shopIds: rows.map((r) => r.id),
    })
  }
  clusters.sort((a, b) => b.count - a.count)
  const duplicateRowCount = clusters.reduce((sum, c) => sum + c.count, 0)

  // ── Field completeness ──
  const fields: { field: string; get: (s: ShopRow) => unknown }[] = [
    { field: "phone", get: (s) => s.phone },
    { field: "website", get: (s) => s.website },
    { field: "hours", get: (s) => s.hours },
    { field: "description", get: (s) => s.description },
    { field: "cover_image_url", get: (s) => s.cover_image_url },
  ]
  const completeness: FieldCompleteness[] = fields.map(({ field, get }) => {
    const populated = shops.filter((s) => isPopulated(get(s))).length
    return {
      field,
      populated,
      total: shops.length,
      pct: shops.length > 0 ? Math.round((populated / shops.length) * 1000) / 10 : 0,
    }
  })
  // specialties is not a `shops` column (only artists has it) — surfaced explicitly
  // rather than silently omitted or queried from the wrong table.
  completeness.push({ field: "specialties (N/A — column exists only on artists)", populated: 0, total: shops.length, pct: 0 })

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      totalShops: shops.length,
      usableShops,
      usablePct: shops.length > 0 ? Math.round((usableShops / shops.length) * 1000) / 10 : 0,
      distinctStateCodes: stateBuckets.filter((b) => b.total > 0).length + nonStandardCodes.length,
      nonStandardStateCodeCount: nonStandardCodes.length,
    },
    states: {
      buckets: stateBuckets,
      zeroCountStates,
      nonStandardCodes,
      noStateCount,
    },
    metros: {
      buckets: metroBuckets,
      belowThreshold,
      outsideTopMetrosOrNoCoords,
      metroThreshold: METRO_USABLE_THRESHOLD,
    },
    duplicates: {
      clusterCount: clusters.length,
      duplicateRowCount,
      sample: clusters.slice(0, 20),
    },
    completeness,
  }
}

// ── Render ───────────────────────────────────────────────────────────────────

export function renderMarkdown(report: AuditReport): string {
  const lines: string[] = []
  const pct = (n: number) => `${n.toFixed(1)}%`

  lines.push(`# TattooMaps Coverage Report`)
  lines.push(``)
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push(``)

  lines.push(`## Executive Summary`)
  lines.push(``)
  lines.push(`| Metric | Value |`)
  lines.push(`|---|---|`)
  lines.push(`| Total shop rows | ${report.totals.totalShops.toLocaleString()} |`)
  lines.push(`| Usable rows (map-visible, per full USABLE definition) | ${report.totals.usableShops.toLocaleString()} |`)
  lines.push(`| Usable % | **${pct(report.totals.usablePct)}** |`)
  lines.push(`| Distinct state codes seen | ${report.totals.distinctStateCodes} |`)
  lines.push(`| Non-standard state codes seen | ${report.totals.nonStandardStateCodeCount} |`)
  lines.push(``)
  if (report.totals.usablePct < 50) {
    lines.push(`> **Most of the table is not usable.** Only ${pct(report.totals.usablePct)} of shop rows pass the full USABLE definition (name, address, city, valid state, non-zero lat/lng, unique slug). The remaining rows are invisible on the map today. Read every count below with that in mind — a state or metro with a large total row count can still be a real gap.`)
    lines.push(``)
  }

  lines.push(`## 1. Shop Count Per State (50 + DC)`)
  lines.push(``)
  lines.push(`Sorted descending by total. "Usable" = passes the full USABLE definition.`)
  lines.push(``)
  lines.push(`| State | Total | Usable | Usable % |`)
  lines.push(`|---|---:|---:|---:|`)
  for (const b of report.states.buckets) {
    lines.push(`| ${b.state} | ${b.total.toLocaleString()} | ${b.usable.toLocaleString()} | ${pct(b.usablePct)} |`)
  }
  lines.push(``)
  lines.push(`**Zero-count states (${report.states.zeroCountStates.length}):** ${report.states.zeroCountStates.length ? report.states.zeroCountStates.join(", ") : "none"}`)
  lines.push(``)
  lines.push(`**Rows with no state set:** ${report.states.noStateCount.toLocaleString()}`)
  lines.push(``)
  if (report.states.nonStandardCodes.length) {
    lines.push(`**Non-standard state codes found** (territories, typos, or bad data — not counted in the 50+DC table above):`)
    lines.push(``)
    lines.push(`| Code | Count |`)
    lines.push(`|---|---:|`)
    for (const c of report.states.nonStandardCodes) lines.push(`| ${c.code} | ${c.count.toLocaleString()} |`)
    lines.push(``)
  }

  lines.push(`## 2. Top 50 US Metros — Usable Shop Coverage`)
  lines.push(``)
  lines.push(`> This section only covers rows with usable coordinates (${pct(report.totals.usablePct)} of the table). Metro boundaries are approximated via a static centroid + tiered radius (40mi/30mi/20mi by population rank) — see \`scripts/lib/metros.ts\`. Flagged: fewer than ${report.metros.metroThreshold} usable shops.`)
  lines.push(``)
  lines.push(`| Rank | Metro | Population | Usable Shops | Flag |`)
  lines.push(`|---:|---|---:|---:|---|`)
  for (const m of report.metros.buckets) {
    lines.push(`| ${m.rank} | ${m.name} | ${m.population.toLocaleString()} | ${m.usableShops.toLocaleString()} | ${m.belowThreshold ? "⚠️ GAP" : ""} |`)
  }
  lines.push(``)
  lines.push(`**Metros below threshold (${report.metros.belowThreshold.length} of 50):** ${report.metros.belowThreshold.map((m) => m.name).join("; ") || "none"}`)
  lines.push(``)
  lines.push(`**Usable shops outside every top-50 metro radius (or lacking coordinates):** ${report.metros.outsideTopMetrosOrNoCoords.toLocaleString()}`)
  lines.push(``)

  lines.push(`## 3. Duplicate Detection`)
  lines.push(``)
  lines.push(`Same normalized (name + address), different \`place_id\`.`)
  lines.push(``)
  lines.push(`- Duplicate clusters: **${report.duplicates.clusterCount.toLocaleString()}**`)
  lines.push(`- Rows involved: **${report.duplicates.duplicateRowCount.toLocaleString()}**`)
  lines.push(``)
  if (report.duplicates.sample.length) {
    lines.push(`Sample (first ${report.duplicates.sample.length} clusters — full list in coverage-report.json):`)
    lines.push(``)
    lines.push(`| Name | Address | Rows | place_ids |`)
    lines.push(`|---|---|---:|---|`)
    for (const c of report.duplicates.sample) {
      lines.push(`| ${c.name} | ${c.address} | ${c.count} | ${c.placeIds.map((p) => p ?? "(null)").join(", ")} |`)
    }
    lines.push(``)
  }

  lines.push(`## 4. Field Completeness (all ${report.totals.totalShops.toLocaleString()} shop rows)`)
  lines.push(``)
  lines.push(`| Field | Populated | Total | % |`)
  lines.push(`|---|---:|---:|---:|`)
  for (const f of report.completeness) {
    lines.push(`| ${f.field} | ${f.populated.toLocaleString()} | ${f.total.toLocaleString()} | ${pct(f.pct)} |`)
  }
  lines.push(``)

  return lines.join("\n")
}
