// link-tattoodo-artists.ts
// Uses the Tattoodo import CSV to finish what the import left out:
//   1. links artists with no shop_id to the active shop at their CSV location
//      (within 150m, and the shop name contains / is ≥0.8 similar to the CSV
//      shop_name — closest wins),
//   2. deactivates non-US artists (CSV longitude > -60, i.e. Europe),
//   3. sets avg_response_hours from the CSV response_time.
// Run: npx tsx scripts/link-tattoodo-artists.ts [--input path.csv] [--apply]
//   Dry-run by default; --apply writes (undo-logged).

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog, loggedUpdate } from "./lib/undo-log"
import {
  GridIndex,
  coords,
  fetchAll,
  haversineMeters,
  modeBanner,
  normalizeName,
  parseCSV,
  runPool,
  similarity,
  writeCsv,
} from "./lib/cleanup-utils"

const ARGS = parseScriptArgs()
const CSV_PATH = path.resolve(ARGS.input ?? "/Users/hashoutlaw/Desktop/us_artists_import.csv")
const LINK_RADIUS_M = 150
const NAME_SIMILARITY = 0.8
const NON_US_LONGITUDE = -60

const RESPONSE_HOURS: Record<string, number> = {
  "an hour": 1,
  "3 hours": 3,
  "5 hours": 5,
  "8 hours": 8,
  "a day": 24,
  "2 days": 48,
  "a few days": 72,
}

type Row = Record<string, unknown>

async function main() {
  modeBanner(ARGS.apply)
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`)
    process.exit(1)
  }
  const csvRows = parseCSV(fs.readFileSync(CSV_PATH, "utf-8"))
  const csvBySlug = new Map(csvRows.filter((r) => r.slug?.trim()).map((r) => [r.slug.trim(), r]))
  console.log(`CSV: ${csvRows.length} rows (${csvBySlug.size} with a slug) from ${CSV_PATH}`)

  const supabase = getSupabaseAdmin()
  const artists = await fetchAll(
    supabase,
    "artists",
    "id, handle, display_name, shop_id, is_active, avg_response_hours, user_id, is_claimed",
    (q) => q.eq("source", "tattoodo")
  )
  const joined = artists
    .map((a) => ({ artist: a, csv: csvBySlug.get(String(a.handle ?? "")) }))
    .filter((j): j is { artist: Row; csv: Record<string, string> } => Boolean(j.csv))
  console.log(`Tattoodo artists in DB: ${artists.length}, joined to CSV by handle = slug: ${joined.length}`)

  const shops = await fetchAll(supabase, "shops", "id, name, latitude, longitude", (q) => q.eq("is_active", true))
  const grid = new GridIndex<Row>(0.005, 0.008)
  for (const s of shops) {
    const c = coords(s)
    if (c) grid.add(c[0], c[1], s)
  }

  const patches = new Map<string, { artist: Row; patch: Row }>()
  const addPatch = (artist: Row, patch: Row) => {
    const k = String(artist.id)
    const cur = patches.get(k) ?? { artist, patch: {} }
    Object.assign(cur.patch, patch)
    patches.set(k, cur)
  }

  // 1. Link unlinked artists to a nearby shop with a matching name
  const linked: Row[] = []
  const unmatched: Row[] = []
  for (const { artist, csv } of joined) {
    if (artist.shop_id) continue
    const lat = Number(csv.latitude)
    const lng = Number(csv.longitude)
    const csvShop = normalizeName(csv.shop_name)
    let best: { shop: Row; dist: number } | null = null
    if (csvShop && Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      for (const s of grid.near(lat, lng)) {
        const [slat, slng] = coords(s)!
        const dist = haversineMeters(lat, lng, slat, slng)
        if (dist > LINK_RADIUS_M) continue
        const n = normalizeName(s.name)
        if (!n.includes(csvShop) && similarity(n, csvShop) < NAME_SIMILARITY) continue
        if (!best || dist < best.dist) best = { shop: s, dist }
      }
    }
    if (best) {
      addPatch(artist, { shop_id: best.shop.id })
      linked.push({ artist: artist.display_name, csv_shop: csv.shop_name, shop: best.shop.name, dist: Math.round(best.dist) })
    } else {
      unmatched.push({
        artist_id: artist.id,
        handle: artist.handle,
        display_name: artist.display_name,
        shop_name: csv.shop_name,
        city: csv.city,
        state: csv.state,
        latitude: csv.latitude,
        longitude: csv.longitude,
      })
    }
  }

  // 2. Deactivate non-US artists
  const nonUs: Row[] = []
  const protectedNonUs: Row[] = []
  for (const { artist, csv } of joined) {
    const lng = Number(csv.longitude)
    if (!csv.longitude?.trim() || !Number.isFinite(lng) || lng <= NON_US_LONGITUDE) continue
    if (!artist.is_active) continue
    if (artist.user_id || artist.is_claimed) {
      protectedNonUs.push(artist)
      continue
    }
    addPatch(artist, { is_active: false })
    nonUs.push({ ...artist, csv_city: csv.city, csv_country: csv.country, lng })
  }

  // 3. avg_response_hours
  const responseCounts: Record<string, number> = {}
  const unknownResponse: Record<string, number> = {}
  for (const { artist, csv } of joined) {
    const raw = (csv.response_time ?? "").trim().toLowerCase()
    if (!raw) continue
    const hours = RESPONSE_HOURS[raw]
    if (hours === undefined) {
      unknownResponse[raw] = (unknownResponse[raw] ?? 0) + 1
      continue
    }
    if (Number(artist.avg_response_hours) === hours && artist.avg_response_hours != null) continue
    addPatch(artist, { avg_response_hours: hours })
    responseCounts[raw] = (responseCounts[raw] ?? 0) + 1
  }

  const unmatchedPath = writeCsv(
    "data/tattoodo-unmatched.csv",
    ["artist_id", "handle", "display_name", "shop_name", "city", "state", "latitude", "longitude"],
    unmatched
  )

  console.log(`\n── Summary ──`)
  console.log(`Artists linked to a shop:          ${linked.length}`)
  for (const l of linked.slice(0, 10)) console.log(`  ${l.artist} → ${l.shop} (CSV: "${l.csv_shop}", ${l.dist}m)`)
  if (linked.length > 10) console.log(`  … ${linked.length - 10} more`)
  console.log(`Unlinked artists with no match:    ${unmatched.length}`)
  for (const u of unmatched) console.log(`  ${u.display_name} — shop_name: "${u.shop_name || "(blank)"}" (${u.city ?? ""}, ${u.state ?? ""})`)
  console.log(`Non-US artists to deactivate:      ${nonUs.length}`)
  for (const a of nonUs) console.log(`  ${a.display_name} (${a.handle}) — ${a.csv_city ?? ""} ${a.csv_country ?? ""} lng ${a.lng}`)
  if (protectedNonUs.length)
    console.log(`Non-US but claimed/user-owned (NOT deactivated): ${protectedNonUs.map((a) => a.handle).join(", ")}`)
  console.log(`avg_response_hours to set:         ${Object.values(responseCounts).reduce((a, b) => a + b, 0)}`)
  for (const [k, n] of Object.entries(responseCounts)) console.log(`  "${k}" → ${RESPONSE_HOURS[k]}h: ${n}`)
  if (Object.keys(unknownResponse).length)
    console.log(`  Unrecognized response_time values (left null): ${JSON.stringify(unknownResponse)}`)
  console.log(`Artists to update in total:        ${patches.size}`)
  console.log(`\nWrote ${unmatchedPath}`)

  if (!ARGS.apply) {
    console.log("\nDRY RUN — no changes made. Re-run with --apply to write.")
    return
  }

  const undo = new UndoLog("link-tattoodo-artists")
  let done = 0
  await runPool(Array.from(patches.values()), 10, async ({ artist, patch }) => {
    await loggedUpdate(supabase, undo, "artists", String(artist.id), artist, patch)
    done++
  })
  console.log(`\nUpdated ${done} artists. Undo log: ${undo.file}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
