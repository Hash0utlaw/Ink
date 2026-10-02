// overture/fetch.ts
// READ ONLY — never touches Supabase. Pulls US tattoo shops out of the latest
// Overture Maps places release and writes them to CSV for match-open-data.ts.
// Run: npx tsx scripts/overture/fetch.ts [--refresh] [--with-fsq]
//   --refresh    re-download even if this release is already staged locally
//   --with-fsq   also pull US tattoo places from Foursquare OS Places
//                (needs HF_TOKEN in .env.local; used only for closures and
//                blank-filling, never to add shops)
//
// Needs the DuckDB CLI (brew install duckdb). The release is found through
// Overture's STAC catalog, never hardcoded. Raw rows are staged in
// data/overture/<release>.duckdb so re-runs don't re-download.
//
// Outputs:
//   data/overture_tattoo.csv          open / temporarily closed rows, filtered + deduped
//   data/overture_tattoo_closed.csv   permanently closed rows (closure flagging only)
//   data/fsq_tattoo.csv               (--with-fsq) Foursquare rows

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { spawnSync } from "child_process"
import { parseScriptArgs } from "../lib/args"
import { US_STATES_PLUS_DC } from "../lib/audit"
import { GridIndex, haversineMeters, normalizeName, writeCsv } from "../lib/cleanup-utils"
import { nonTattooTerm } from "../lib/non-tattoo"

const ARGS = parseScriptArgs()
const STAC_ROOT = "https://stac.overturemaps.org/catalog.json"
const STAGE_DIR = path.resolve("data/overture")
const OUT_CSV = "data/overture_tattoo.csv"
const OUT_CLOSED_CSV = "data/overture_tattoo_closed.csv"
const OUT_FSQ_CSV = "data/fsq_tattoo.csv"

// Bbox prune: continental US + Alaska + Hawaii.
const BBOX = { xmin: -180, xmax: -64, ymin: 18, ymax: 72 }
const DEDUPE_RADIUS_M = 100
const CLOSED_STATUS = "permanently_closed"

// Taxonomy values that contain "tattoo" but aren't tattoo studios. Anything
// discovered that isn't listed here is used.
const EXCLUDED_TATTOO_VALUES = new Set(["tattoo_removal"])
// Piercing-only categories: a row whose primary category is one of these is
// dropped even if an alternate says tattoo.
const PIERCING_ONLY = /piercing/i

const CSV_HEADERS = [
  "id", "name", "freeform", "locality", "region", "postcode", "lat", "lng",
  "phones", "websites", "emails", "socials", "confidence", "operating_status", "sources",
]

// ── DuckDB ───────────────────────────────────────────────────────────────────

// SQL goes in on stdin, not argv, so tokens never show up in `ps`.
function duck<T = Record<string, unknown>>(db: string, sql: string, json = false): T[] {
  const r = spawnSync("duckdb", json ? [db, "-json"] : [db], { input: sql, encoding: "utf-8", maxBuffer: 1 << 30 })
  if (r.error) throw r.error
  if (r.status !== 0) throw new Error(`duckdb failed:\n${r.stderr}`)
  if (!json) return []
  const out = r.stdout.trim()
  return out ? (JSON.parse(out) as T[]) : []
}

function requireDuckdb(): void {
  const r = spawnSync("duckdb", ["--version"], { encoding: "utf-8" })
  if (r.error || r.status !== 0) {
    console.error("DuckDB CLI not found. Install it with: brew install duckdb")
    process.exit(1)
  }
  console.log(`DuckDB ${r.stdout.trim()}`)
}

const sqlStr = (s: string) => `'${s.replace(/'/g, "''")}'`
const STATES_SQL = Array.from(US_STATES_PLUS_DC).map(sqlStr).join(", ")

// ── STAC: latest release → places/place parquet files touching the bbox ──────

interface StacLink { rel: string; href: string; title?: string; latest?: boolean }

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  return (await res.json()) as T
}

async function latestPlaceFiles(): Promise<{ release: string; files: string[] }> {
  const root = await getJson<{ latest?: string; links: StacLink[] }>(STAC_ROOT)
  const children = root.links.filter((l) => l.rel === "child")
  const latest =
    children.find((l) => root.latest && l.href.includes(`/${root.latest}/`)) ??
    children.find((l) => l.latest) ??
    children.sort((a, b) => a.href.localeCompare(b.href)).at(-1)
  if (!latest) throw new Error("No releases in STAC catalog")
  const release = root.latest ?? latest.href.split("/").at(-2)!

  const releaseCat = await getJson<{ links: StacLink[] }>(latest.href)
  const placesLink = releaseCat.links.find((l) => l.rel === "child" && l.title === "places")
  if (!placesLink) throw new Error(`Release ${release} has no places theme`)
  const placesCat = await getJson<{ links: StacLink[] }>(placesLink.href)
  const placeLink = placesCat.links.find((l) => l.rel === "child" && l.title === "place")
  if (!placeLink) throw new Error(`Release ${release} has no places/place collection`)
  const collection = await getJson<{ links: StacLink[] }>(placeLink.href)

  const items = collection.links.filter((l) => l.rel === "item")
  const files: string[] = []
  for (const link of items) {
    const item = await getJson<{ bbox: number[]; assets: Record<string, { href: string }> }>(link.href)
    const [xmin, ymin, xmax, ymax] = item.bbox
    const intersects = xmin <= BBOX.xmax && xmax >= BBOX.xmin && ymin <= BBOX.ymax && ymax >= BBOX.ymin
    const href = item.assets.aws?.href ?? Object.values(item.assets)[0]?.href
    if (intersects && href) files.push(href)
  }
  console.log(`Release ${release}: ${files.length} of ${items.length} place files intersect the US bbox`)
  return { release, files }
}

// ── Staging ──────────────────────────────────────────────────────────────────

const ANY_TATTOO = (list: string) => `len(list_filter(coalesce(${list}, []), lambda x: contains(lower(x), 'tattoo'))) > 0`

function stageOverture(db: string, files: string[]): void {
  const fileList = files.map(sqlStr).join(", ")
  console.log("Staging US rows with any tattoo taxonomy value (bbox-pruned remote read; can take several minutes)…")
  duck(
    db,
    `INSTALL httpfs; LOAD httpfs;
     CREATE OR REPLACE TABLE us_tattoo AS
     SELECT
       id,
       names."primary" AS name,
       addresses[1].freeform AS freeform,
       addresses[1].locality AS locality,
       addresses[1].postcode AS postcode,
       upper(replace(addresses[1].region, 'US-', '')) AS region,
       (bbox.ymin + bbox.ymax) / 2 AS lat,
       (bbox.xmin + bbox.xmax) / 2 AS lng,
       phones, websites, emails, socials, confidence, operating_status, sources,
       taxonomy."primary" AS tax_primary,
       taxonomy.alternates AS tax_alternates,
       taxonomy.hierarchy AS tax_hierarchy
     FROM read_parquet([${fileList}], hive_partitioning = false)
     WHERE bbox.xmin >= ${BBOX.xmin} AND bbox.xmax <= ${BBOX.xmax}
       AND bbox.ymin >= ${BBOX.ymin} AND bbox.ymax <= ${BBOX.ymax}
       AND addresses[1].country = 'US'
       AND upper(replace(addresses[1].region, 'US-', '')) IN (${STATES_SQL})
       AND (contains(lower(coalesce(taxonomy."primary", '')), 'tattoo')
            OR ${ANY_TATTOO("taxonomy.alternates")}
            OR ${ANY_TATTOO("taxonomy.hierarchy")});`
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

interface StagedRow {
  id: string
  name: string | null
  freeform: string | null
  locality: string | null
  region: string
  postcode: string | null
  lat: number
  lng: number
  phones: string[] | null
  websites: string[] | null
  emails: string[] | null
  socials: string[] | null
  confidence: number | null
  operating_status: string | null
  sources: unknown
  tax_primary: string | null
  tax_alternates: string[] | null
  tax_hierarchy: string[] | null
}

// Deterministic sampling so re-runs show the same examples.
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function sample<T>(items: T[], n: number, rand: () => number): T[] {
  const copy = items.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

async function main() {
  console.log("Read only — nothing is written to the database.\n")
  requireDuckdb()
  const { release, files } = await latestPlaceFiles()

  fs.mkdirSync(STAGE_DIR, { recursive: true })
  const db = path.join(STAGE_DIR, `${release}.duckdb`)
  const staged = fs.existsSync(db) && duck(db, "SELECT 1 AS ok FROM information_schema.tables WHERE table_name = 'us_tattoo';", true).length > 0
  if (staged && !ARGS.refresh) console.log(`Using staged rows in ${db} (pass --refresh to re-download)`)
  else stageOverture(db, files)

  const [{ n: stagedCount }] = duck<{ n: number }>(db, "SELECT count(*) AS n FROM us_tattoo;", true)
  console.log(`  ${stagedCount} US rows staged\n`)

  // ── Discovery: every distinct taxonomy value containing "tattoo" ──
  const values = duck<{ field: string; value: string; n: number }>(
    db,
    `SELECT 'primary' AS field, tax_primary AS value, count(*) AS n FROM us_tattoo
       WHERE contains(lower(tax_primary), 'tattoo') GROUP BY ALL
     UNION ALL
     SELECT 'alternates', v, count(*) FROM (SELECT unnest(tax_alternates) AS v FROM us_tattoo)
       WHERE contains(lower(v), 'tattoo') GROUP BY ALL
     UNION ALL
     SELECT 'hierarchy', v, count(*) FROM (SELECT unnest(tax_hierarchy) AS v FROM us_tattoo)
       WHERE contains(lower(v), 'tattoo') GROUP BY ALL
     ORDER BY field, n DESC;`,
    true
  )
  console.log("── Taxonomy values containing \"tattoo\" (US rows) ──")
  for (const v of values) {
    const tag = EXCLUDED_TATTOO_VALUES.has(v.value) ? "  (excluded)" : ""
    console.log(`  ${v.field.padEnd(11)} ${v.value.padEnd(32)} ${String(v.n).padStart(6)}${tag}`)
  }
  const used = new Set(values.map((v) => v.value).filter((v) => !EXCLUDED_TATTOO_VALUES.has(v)))
  console.log(`Using ${used.size} value(s): ${Array.from(used).sort().join(", ")}\n`)

  // ── operating_status ──
  const statuses = duck<{ status: string; n: number }>(
    db,
    "SELECT coalesce(operating_status, '(null)') AS status, count(*) AS n FROM us_tattoo GROUP BY ALL ORDER BY n DESC;",
    true
  )
  console.log("── operating_status (all staged US rows) ──")
  for (const s of statuses) console.log(`  ${s.status.padEnd(20)} ${s.n}`)
  console.log(`Excluding ${CLOSED_STATUS} from ${OUT_CSV} (kept separately in ${OUT_CLOSED_CSV} for closure flagging)\n`)

  // ── Filter in TS (shares the name filter with flag-non-tattoo.ts) ──
  const exportFile = path.join(STAGE_DIR, `${release}-us_tattoo.json`)
  duck(db, `COPY us_tattoo TO ${sqlStr(exportFile)} (FORMAT json);`)
  const rows = fs
    .readFileSync(exportFile, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as StagedRow)

  const hasUsedValue = (r: StagedRow) =>
    [r.tax_primary, ...(r.tax_alternates ?? []), ...(r.tax_hierarchy ?? [])].some((v) => v != null && used.has(v))
  const piercingOnly = (r: StagedRow) =>
    r.tax_primary != null && PIERCING_ONLY.test(r.tax_primary) && !/tattoo/i.test(r.tax_primary)

  const drops = { noName: 0, excludedValue: 0, piercingOnly: 0, nonTattooName: 0 }
  const nameTerms: Record<string, number> = {}
  const kept: StagedRow[] = []
  for (const r of rows) {
    if (!r.name?.trim()) { drops.noName++; continue }
    if (!hasUsedValue(r)) { drops.excludedValue++; continue }
    if (piercingOnly(r)) { drops.piercingOnly++; continue }
    const term = nonTattooTerm(r.name)
    if (term) { drops.nonTattooName++; nameTerms[term] = (nameTerms[term] ?? 0) + 1; continue }
    kept.push(r)
  }
  console.log("── Filtering ──")
  console.log(`  staged:                        ${rows.length}`)
  console.log(`  dropped, no name:              ${drops.noName}`)
  console.log(`  dropped, only excluded values: ${drops.excludedValue}`)
  console.log(`  dropped, piercing-only primary:${String(drops.piercingOnly).padStart(2)}`)
  console.log(`  dropped, non-tattoo name:      ${drops.nonTattooName}  ${JSON.stringify(nameTerms)}`)

  // ── Dedupe among Overture rows: same normalized name within 100m → keep highest confidence ──
  const sorted = kept.slice().sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
  const grid = new GridIndex<StagedRow>(0.01, 0.015)
  const deduped: StagedRow[] = []
  let dupes = 0
  for (const r of sorted) {
    const key = normalizeName(r.name)
    const clash = grid
      .near(r.lat, r.lng)
      .some((o) => normalizeName(o.name) === key && haversineMeters(r.lat, r.lng, o.lat, o.lng) <= DEDUPE_RADIUS_M)
    if (clash) { dupes++; continue }
    grid.add(r.lat, r.lng, r)
    deduped.push(r)
  }
  console.log(`  dropped, duplicate (same name ≤${DEDUPE_RADIUS_M}m, lower confidence): ${dupes}`)

  const open = deduped.filter((r) => r.operating_status !== CLOSED_STATUS)
  const closed = deduped.filter((r) => r.operating_status === CLOSED_STATUS)
  console.log(`  kept: ${open.length} (+ ${closed.length} permanently closed)\n`)

  const toCsv = (r: StagedRow) => ({
    ...r,
    phones: r.phones ?? [],
    websites: r.websites ?? [],
    emails: r.emails ?? [],
    socials: r.socials ?? [],
  })
  const byId = (a: StagedRow, b: StagedRow) => a.id.localeCompare(b.id)
  console.log(`Wrote ${writeCsv(OUT_CSV, CSV_HEADERS, open.sort(byId).map(toCsv))}`)
  console.log(`Wrote ${writeCsv(OUT_CLOSED_CSV, CSV_HEADERS, closed.sort(byId).map(toCsv))}\n`)

  // ── Confidence histogram + samples ──
  const bands = new Map<number, StagedRow[]>()
  for (let b = 0; b < 10; b++) bands.set(b, [])
  for (const r of open) bands.get(Math.min(9, Math.floor((r.confidence ?? 0) * 10)))!.push(r)
  const max = Math.max(...Array.from(bands.values()).map((b) => b.length), 1)
  console.log(`── Confidence histogram (${OUT_CSV}, ${open.length} rows) ──`)
  for (const [b, list] of bands) {
    const label = `${(b / 10).toFixed(1)}–${((b + 1) / 10).toFixed(1)}`
    console.log(`  ${label}  ${String(list.length).padStart(6)}  ${"█".repeat(Math.round((list.length / max) * 40))}`)
  }
  const rand = mulberry32(42)
  for (const [b, list] of bands) {
    if (!list.length) continue
    console.log(`\n  Band ${(b / 10).toFixed(1)}–${((b + 1) / 10).toFixed(1)} sample:`)
    for (const r of sample(list, 10, rand)) {
      console.log(`    ${(r.confidence ?? 0).toFixed(2)}  ${r.name} — ${r.locality ?? "?"}, ${r.region} — ${r.websites?.[0] ?? "(no website)"}`)
    }
  }

  if (ARGS.withFsq) await fetchFoursquare(db)
}

// ── Step 2: Foursquare OS Places (optional) ──────────────────────────────────

async function fetchFoursquare(db: string): Promise<void> {
  console.log("\n── Foursquare OS Places ──")
  const token = process.env.HF_TOKEN?.trim()
  if (!token) {
    console.log(`HF_TOKEN is not set in .env.local — skipping Foursquare.
  1. Sign in at https://huggingface.co and open https://huggingface.co/datasets/foursquare/fsq-os-places
  2. Accept the dataset terms ("Agree and access repository").
  3. Create a read token at https://huggingface.co/settings/tokens
  4. Add HF_TOKEN=hf_... to .env.local and re-run with --with-fsq.`)
    return
  }

  const res = await fetch("https://huggingface.co/api/datasets/foursquare/fsq-os-places/tree/main/release", {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Hugging Face API → ${res.status} (has the token's account accepted the dataset terms?)`)
  const dirs = ((await res.json()) as { type: string; path: string }[])
    .filter((e) => e.type === "directory" && /dt=\d{4}-\d{2}-\d{2}$/.test(e.path))
    .map((e) => e.path)
    .sort()
  const latest = dirs.at(-1)
  if (!latest) throw new Error("No Foursquare releases found")
  console.log(`Foursquare release ${latest}`)

  duck(
    db,
    `INSTALL httpfs; LOAD httpfs;
     CREATE OR REPLACE SECRET hf (TYPE huggingface, TOKEN ${sqlStr(token)});
     CREATE OR REPLACE TABLE fsq_us_tattoo AS
     SELECT fsq_place_id, name, latitude, longitude, address, locality, region, postcode,
            tel, website, email, instagram, facebook_id, date_refreshed, date_closed
     FROM read_parquet('hf://datasets/foursquare/fsq-os-places/${latest}/places/parquet/*.parquet')
     WHERE country = 'US'
       AND region IN (${STATES_SQL})
       AND len(list_filter(coalesce(fsq_category_labels, []), lambda x: contains(x, 'Tattoo'))) > 0;
     COPY fsq_us_tattoo TO ${sqlStr(path.resolve(OUT_FSQ_CSV))} (HEADER);`
  )
  const [{ n, closed }] = duck<{ n: number; closed: number }>(
    db,
    "SELECT count(*) AS n, count(date_closed) AS closed FROM fsq_us_tattoo;",
    true
  )
  console.log(`  ${n} US tattoo places (${closed} with date_closed)`)
  console.log(`Wrote ${path.resolve(OUT_FSQ_CSV)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
