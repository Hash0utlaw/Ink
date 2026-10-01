// match-open-data.ts
// Matches Overture (and optionally Foursquare) tattoo places from
// scripts/overture/fetch.ts against ACTIVE shops, fills blank fields on
// matches, flags possible closures, and inserts unmatched Overture rows as
// new shops. Never deletes rows, never deactivates, never overwrites a
// non-null value.
// Run: npx tsx scripts/match-open-data.ts [--apply] [--mode=all|enrich|insert] [--with-fsq]
//          [--min-confidence=0.7] [--require-open] [--require-street] [--require-contact] [--min-sources=N]
//   --mode=enrich  fill matched shops + possibly_closed only (no inserts)
//   --mode=insert  new shops only (matching still runs, to know what's new)
//   --mode=all     both (default)
//   Insert filters: --require-open (operating_status 'open'; null fails),
//   --require-street (address starts with a street number), --require-contact
//   (phone or website), --min-sources=N (distinct independent datasets —
//   Overture's own "Overture"/"Overture-signals" entries don't count).
//   Insert mode also drops names with "removal"/"laser", and sends beauty /
//   PMU names, handle-like names ("ink.by.jo") and rows ≤50m of an active
//   shop to data/overture-insert-review.csv instead of inserting.
//   --output=<csv>       where the final insert set is written
//                        (default data/overture-new-shops.csv)
//   --input-final=<csv>  insert exactly the rows in that file (a previous
//                        --output), no recomputation. Each row is re-checked
//                        and skipped if its overture_id or slug is now used or
//                        it's ≤50m of an active shop.
//   --compare-tiers  dry-run comparison of insert tiers T1–T4 (no writes ever);
//                    writes data/overture-new-T{1..4}.csv, overture-sample-T1.csv
//                    and overture-holdback.csv.
//   Dry-run by default. CSV reports are written either way; --apply also
//   writes to Supabase (undo-logged) and requires the columns from
//   supabase/migrations/20260930120000_open_data_columns.sql.
//   --with-fsq  also use data/fsq_tattoo.csv — closures + blank-filling on
//               matched shops only; Foursquare never adds shops.
//
// Matching (active shops only):
//   with coordinates:    ≤100m AND name similarity ≥ 0.8 (generic words removed),
//                        OR same 10-digit phone ≤500m
//   without coordinates: same name (generic words removed) + zip,
//                        or same name + city + state
// Phone-only matches whose names are < 0.5 similar (generic words removed)
// are not used at all — no fill, no overture_id, no insert — and go to
// data/overture-phone-review.csv.
// An Overture row matches at most one shop (closest wins; the rest go to
// data/overture-ambiguous.csv) and a shop takes at most one Overture row
// (overture_id is unique) — later claimants count as duplicates of it.
//
// Inserts are undo-logged as is_active false → true, so scripts/undo.ts
// deactivates them rather than deleting.

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import { randomUUID } from "crypto"
import { parseScriptArgs } from "./lib/args"
import { US_STATES_PLUS_DC } from "./lib/audit"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import type { SupabaseClient } from "@supabase/supabase-js"
import { UndoLog, loggedUpdate } from "./lib/undo-log"
import {
  GridIndex,
  coords,
  fetchAll,
  haversineMeters,
  isEmptyValue,
  modeBanner,
  normalizeName,
  normalizePhone,
  parseCSV,
  runPool,
  similarity,
  writeCsv,
} from "./lib/cleanup-utils"

type Row = Record<string, unknown>

const ARGS = parseScriptArgs()
const MIN_CONFIDENCE = ARGS.minConfidence ?? 0.7
const NAME_RADIUS_M = 100
const NAME_SIMILARITY = 0.8
const PHONE_RADIUS_M = 500
const INACTIVE_RADIUS_M = 100
const INSERT_BATCH = 200
const PHONE_REVIEW_SIMILARITY = 0.5
const TIER_NEAR_ACTIVE_M = 50
// Overture's own conflation/signal entries — not independent corroboration.
const INTERNAL_DATASETS = new Set(["overture", "overture-signals"])
// Word-start match, so "Tattooing", "Inked", "Artistry" count as shop-like.
const SHOP_WORD = /\b(tattoo|ink|studio|art|parlor|galler|collective|needle|skin|body)/i
const STREET_NUMBER = /^\d+[a-z]?(-\d+[a-z]?)?\s/i

const OVERTURE_CSV = "data/overture_tattoo.csv"
const OVERTURE_CLOSED_CSV = "data/overture_tattoo_closed.csv"
const FSQ_CSV = "data/fsq_tattoo.csv"
const NEW_COLUMNS = ["overture_id", "instagram_url", "facebook_url", "possibly_closed"]
const FILL_FIELDS = ["latitude", "longitude", "state", "zip", "phone", "website", "email", "instagram_url", "facebook_url"]

const BENCHMARKS: Record<string, number> = {
  KS: 152, MT: 116, SC: 207, ID: 193, OR: 645, HI: 231, UT: 298, WY: 69, ND: 62,
  MS: 113, NE: 180, IA: 269, SD: 84, GA: 602, PA: 995, NH: 160, VT: 72, ME: 126,
}

const GENERIC_WORDS = new Set(["tattoo", "tattoos", "studio", "shop", "parlor", "co", "company", "llc", "inc", "the"])

// ── Normalizers ──────────────────────────────────────────────────────────────

// "The Ink Spot Tattoo Co., LLC" → "inkspot". Falls back to the full
// normalized name when every word is generic ("Tattoo Shop").
function matchName(name: unknown): string {
  const words = String(name ?? "").toLowerCase().replace(/&/g, " and ").split(/[^a-z0-9]+/).filter(Boolean)
  const kept = words.filter((w) => !GENERIC_WORDS.has(w)).join("")
  return kept || normalizeName(name)
}

const zip5 = (z: unknown) => String(z ?? "").match(/\d{5}/)?.[0] ?? null
const cityKey = (c: unknown) => String(c ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")
const stateCode = (s: unknown) => {
  const v = String(s ?? "").trim().toUpperCase().replace(/^US-/, "")
  return US_STATES_PLUS_DC.has(v) ? v : null
}

// Same display format as existing rows: "+1 910-745-9390".
function formatPhone(p: unknown): string | null {
  const d = normalizePhone(p)
  return d ? `+1 ${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : null
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
}

function jsonList(v: unknown): string[] {
  if (!v) return []
  try {
    const parsed = JSON.parse(String(v))
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string" && x.trim()) : []
  } catch {
    return []
  }
}

// ── Source rows (Overture + Foursquare in one shape) ─────────────────────────

interface Place {
  source: "overture" | "overture-closed" | "fsq"
  id: string
  name: string
  lat: number | null
  lng: number | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  phones: string[] // normalized 10-digit
  website: string | null
  email: string | null
  instagram: string | null
  facebook: string | null
  confidence: number
  status: string | null
  closed: boolean
  datasets: string[] // distinct independent source datasets
  rawDatasets: number // distinct datasets including Overture's own entries
}

function readCsv(file: string): Row[] {
  if (!fs.existsSync(file)) {
    console.error(`${file} not found — run: npx tsx scripts/overture/fetch.ts${file === FSQ_CSV ? " --with-fsq" : ""}`)
    process.exit(1)
  }
  return parseCSV(fs.readFileSync(file, "utf-8"))
}

function overturePlace(r: Row, source: Place["source"]): Place {
  const socials = jsonList(r.socials)
  const lat = parseFloat(String(r.lat))
  const lng = parseFloat(String(r.lng))
  return {
    source,
    id: String(r.id),
    name: String(r.name),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    address: String(r.freeform ?? "").trim() || null,
    city: String(r.locality ?? "").trim() || null,
    state: stateCode(r.region),
    zip: zip5(r.postcode),
    phones: jsonList(r.phones).map(normalizePhone).filter((p): p is string => !!p),
    website: jsonList(r.websites)[0] ?? null,
    email: jsonList(r.emails)[0] ?? null,
    instagram: socials.find((s) => /instagram\.com/i.test(s)) ?? null,
    facebook: socials.find((s) => /facebook\.com/i.test(s)) ?? null,
    confidence: parseFloat(String(r.confidence)) || 0,
    status: String(r.operating_status ?? "") || null,
    closed: source === "overture-closed",
    ...datasetsOf(r.sources),
  }
}

function datasetsOf(v: unknown): { datasets: string[]; rawDatasets: number } {
  let list: { dataset?: string }[] = []
  try {
    list = JSON.parse(String(v ?? "[]"))
  } catch {
    // leave empty
  }
  const all = new Set(list.map((x) => String(x.dataset ?? "")).filter(Boolean))
  return { datasets: Array.from(all).filter((d) => !INTERNAL_DATASETS.has(d.toLowerCase())), rawDatasets: all.size }
}

function fsqPlace(r: Row): Place {
  const lat = parseFloat(String(r.latitude))
  const lng = parseFloat(String(r.longitude))
  const ig = String(r.instagram ?? "").trim().replace(/^@/, "")
  const fb = String(r.facebook_id ?? "").trim()
  const phone = normalizePhone(r.tel)
  return {
    source: "fsq",
    id: String(r.fsq_place_id),
    name: String(r.name),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    address: String(r.address ?? "").trim() || null,
    city: String(r.locality ?? "").trim() || null,
    state: stateCode(r.region),
    zip: zip5(r.postcode),
    phones: phone ? [phone] : [],
    website: String(r.website ?? "").trim() || null,
    email: String(r.email ?? "").trim() || null,
    instagram: ig ? (/^https?:/i.test(ig) ? ig : `https://www.instagram.com/${ig}`) : null,
    facebook: fb ? (/^https?:/i.test(fb) ? fb : `https://www.facebook.com/${fb}`) : null,
    confidence: 1,
    status: null,
    closed: !!String(r.date_closed ?? "").trim(),
    datasets: ["foursquare"],
    rawDatasets: 1,
  }
}

// ── Matcher ──────────────────────────────────────────────────────────────────

interface Candidate {
  shop: Row
  distance: number // Infinity for name+zip / name+city matches on shops without coordinates
  via: "name≤100m" | "phone≤500m" | "name+zip" | "name+city"
}

class ShopMatcher {
  private grid = new GridIndex<{ shop: Row; lat: number; lng: number; name: string; phone: string | null }>(0.01, 0.015)
  private byZip = new Map<string, Row[]>()
  private byCity = new Map<string, Row[]>()

  constructor(shops: Row[]) {
    for (const s of shops) {
      const c = coords(s)
      if (c) {
        this.grid.add(c[0], c[1], { shop: s, lat: c[0], lng: c[1], name: matchName(s.name), phone: normalizePhone(s.phone) })
        continue
      }
      const name = matchName(s.name)
      const z = zip5(s.zip)
      if (z) push(this.byZip, `${name}|${z}`, s)
      const st = stateCode(s.state)
      if (s.city && st) push(this.byCity, `${name}|${cityKey(s.city)}|${st}`, s)
    }
  }

  candidates(p: Place): Candidate[] {
    const out = new Map<string, Candidate>()
    const add = (c: Candidate) => {
      const id = String(c.shop.id)
      const prev = out.get(id)
      if (!prev || c.distance < prev.distance) out.set(id, c)
    }
    const name = matchName(p.name)
    if (p.lat != null && p.lng != null) {
      for (const s of this.grid.near(p.lat, p.lng)) {
        const d = haversineMeters(p.lat, p.lng, s.lat, s.lng)
        if (d <= NAME_RADIUS_M && similarity(name, s.name) >= NAME_SIMILARITY) add({ shop: s.shop, distance: d, via: "name≤100m" })
        else if (d <= PHONE_RADIUS_M && s.phone && p.phones.includes(s.phone)) add({ shop: s.shop, distance: d, via: "phone≤500m" })
      }
    }
    if (p.zip) for (const s of this.byZip.get(`${name}|${p.zip}`) ?? []) add({ shop: s, distance: Infinity, via: "name+zip" })
    if (p.city && p.state)
      for (const s of this.byCity.get(`${name}|${cityKey(p.city)}|${p.state}`) ?? []) add({ shop: s, distance: Infinity, via: "name+city" })

    const rank = (c: Candidate) => (c.via === "name+zip" ? 0 : c.via === "name+city" ? 1 : -1)
    return Array.from(out.values()).sort((a, b) => a.distance - b.distance || rank(a) - rank(b))
  }
}

function push<K, V>(m: Map<K, V[]>, k: K, v: V): void {
  const list = m.get(k)
  if (list) list.push(v)
  else m.set(k, [v])
}

interface Assignment { place: Place; cand: Candidate }

// Phone-only candidate whose name barely resembles the shop's.
function weakPhone(p: Place, c: Candidate): boolean {
  return c.via === "phone≤500m" && similarity(matchName(p.name), matchName(c.shop.name)) < PHONE_REVIEW_SIMILARITY
}

// One shop per place (closest), one place per shop (closest, then highest
// confidence). Weak phone-only candidates are set aside for review and never
// claim a shop. Returns assignments, places that lost their shop to a better
// claimant, phone-review rows, ambiguity rows and unmatched places.
function assign(places: Place[], matcher: ShopMatcher, claimed: Set<string>) {
  const proposals: Assignment[] = []
  const phoneReview: Assignment[] = []
  const ambiguous: Row[] = []
  const unmatched: Place[] = []
  for (const p of places) {
    const all = matcher.candidates(p)
    const cands = all.filter((c) => !weakPhone(p, c))
    if (!cands.length) {
      if (all.length) phoneReview.push({ place: p, cand: all[0] })
      else unmatched.push(p)
      continue
    }
    proposals.push({ place: p, cand: cands[0] })
    for (const other of cands.slice(1)) {
      ambiguous.push({
        source: p.source, source_id: p.id, source_name: p.name, source_city: p.city, source_state: p.state,
        chosen_shop_id: cands[0].shop.id, chosen_shop_name: cands[0].shop.name, chosen_via: cands[0].via,
        chosen_distance_m: Number.isFinite(cands[0].distance) ? Math.round(cands[0].distance) : "",
        other_shop_id: other.shop.id, other_shop_name: other.shop.name, other_via: other.via,
        other_distance_m: Number.isFinite(other.distance) ? Math.round(other.distance) : "",
      })
    }
  }
  proposals.sort((a, b) => a.cand.distance - b.cand.distance || b.place.confidence - a.place.confidence)
  const assigned: Assignment[] = []
  const lostToBetter: Assignment[] = []
  for (const a of proposals) {
    const id = String(a.cand.shop.id)
    if (claimed.has(id)) { lostToBetter.push(a); continue }
    claimed.add(id)
    assigned.push(a)
  }
  return { assigned, lostToBetter, phoneReview, ambiguous, unmatched }
}

// Blank-only patch for a matched shop. `pending` holds values already planned
// for this shop by an earlier source, so Foursquare never overrides Overture.
// Coordinates are only taken when the shop has no state or its state equals
// the source's region — a mismatch means the match is probably wrong, and a
// wrong pin is worse than none. `stats.coordsBlocked` counts those cases.
function fillPatch(shop: Row, p: Place, pending: Row, stats?: { coordsBlocked: number }): Row {
  const patch: Row = {}
  const blank = (f: string) => isEmptyValue(shop[f]) && isEmptyValue(pending[f])
  if (!coords(shop) && isEmptyValue(pending.latitude) && p.lat != null && p.lng != null) {
    const shopState = stateCode(shop.state) ?? (isEmptyValue(shop.state) ? null : String(shop.state))
    if (shopState == null || shopState === p.state) {
      patch.latitude = p.lat
      patch.longitude = p.lng
    } else if (stats) stats.coordsBlocked++
  }
  if (blank("state") && p.state) patch.state = p.state
  if (blank("zip") && p.zip) patch.zip = p.zip
  const phone = formatPhone(p.phones[0])
  if (blank("phone") && phone) patch.phone = phone
  if (blank("website") && p.website) patch.website = p.website
  if (blank("email") && p.email) patch.email = p.email
  if (blank("instagram_url") && p.instagram) patch.instagram_url = p.instagram
  if (blank("facebook_url") && p.facebook) patch.facebook_url = p.facebook
  return patch
}

// ── Insert eligibility ───────────────────────────────────────────────────────

interface InsertCriteria {
  minConfidence: number
  requireOpen: boolean
  requireStreet: boolean
  requireContact: boolean
  minSources: number | null
}

const TIERS: { name: string; label: string; crit: InsertCriteria }[] = [
  { name: "T1", label: "conf≥0.9 open street contact", crit: { minConfidence: 0.9, requireOpen: true, requireStreet: true, requireContact: true, minSources: null } },
  { name: "T2", label: "T1 + sources≥2", crit: { minConfidence: 0.9, requireOpen: true, requireStreet: true, requireContact: true, minSources: 2 } },
  { name: "T3", label: "conf≥0.95 open street contact", crit: { minConfidence: 0.95, requireOpen: true, requireStreet: true, requireContact: true, minSources: null } },
  { name: "T4", label: "conf≥0.8 open street contact", crit: { minConfidence: 0.8, requireOpen: true, requireStreet: true, requireContact: true, minSources: null } },
]

// Reason this row fails the tier filters, or null if it passes.
function tierSkip(p: Place, c: InsertCriteria): string | null {
  if (p.confidence < c.minConfidence) return "lowConfidence"
  if (c.requireOpen && p.status !== "open") return "notOpen"
  if (c.requireStreet && !STREET_NUMBER.test(p.address ?? "")) return "noStreetNumber"
  if (c.requireContact && !p.phones.length && !p.website) return "noContact"
  if (c.minSources != null && p.datasets.length < c.minSources) return "fewSources"
  return null
}

function insertRecord(p: Place, slugs: Set<string>): Row {
  const base = [slugify(p.name), p.city ? slugify(p.city) : "", p.state!.toLowerCase()].filter(Boolean).join("-")
  let slug = base
  for (let n = 2; slugs.has(slug); n++) slug = `${base}-${n}`
  slugs.add(slug)
  const tail = [p.city, [p.state, p.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")
  return {
    id: randomUUID(),
    name: p.name,
    slug,
    address: p.address ? `${p.address}, ${tail}` : null,
    city: p.city,
    state: p.state,
    zip: p.zip,
    phone: formatPhone(p.phones[0]),
    website: p.website,
    email: p.email,
    instagram_url: p.instagram,
    facebook_url: p.facebook,
    latitude: p.lat,
    longitude: p.lng,
    place_id: `overture:${p.id}`,
    overture_id: p.id,
    is_active: true,
    is_verified: false,
    accepts_walk_ins: false,
    rating: 0,
    review_count: 0,
  }
}

// Report-only columns, stripped before insert.
const REPORT_ONLY = ["confidence", "sources"]
const NEW_SHOP_HEADERS = [
  "id", "name", "slug", "address", "city", "state", "zip", "phone", "website", "email", "instagram_url", "facebook_url",
  "latitude", "longitude", "place_id", "overture_id", "confidence", "sources",
]
// Set on every inserted row (not carried in the CSV).
const INSERT_DEFAULTS = { is_active: true, is_verified: false, accepts_walk_ins: false, rating: 0, review_count: 0 }

const DROP_NAME = /removal|laser/i
const REVIEW_BEAUTY = /\b(permanent makeup|pmu|brows?|lash(es)?|microblad\w*|cosmetics?|beauty|salons?|spas?)\b/i
const handleLike = (name: string) => /[._]/.test(name) && !/\s/.test(name.trim())

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (ARGS.compareTiers && ARGS.apply) {
    console.error("--compare-tiers is report-only; it can't be combined with --apply.")
    process.exit(1)
  }
  const mode = ARGS.compareTiers ? "insert" : ARGS.mode
  modeBanner(ARGS.apply)
  console.log(`Mode: ${mode}${ARGS.compareTiers ? " (tier comparison)" : ""}\n`)
  const supabase = getSupabaseAdmin()

  const probe = await supabase.from("shops").select(NEW_COLUMNS.join(", ")).limit(1)
  const hasColumns = !probe.error
  if (!hasColumns) {
    const msg = `shops is missing the open-data columns (${NEW_COLUMNS.join(", ")}): ${probe.error!.message}
Run supabase/migrations/20260930120000_open_data_columns.sql in the Supabase SQL Editor first.`
    if (ARGS.apply) {
      console.error(`Refusing to apply: ${msg}`)
      process.exit(1)
    }
    console.log(`NOTE: ${msg}\n(Dry run continues, treating those columns as empty.)\n`)
  }

  const baseCols = "id, name, slug, address, city, state, zip, phone, website, email, latitude, longitude, place_id, is_active"
  const cols = hasColumns ? `${baseCols}, ${NEW_COLUMNS.join(", ")}` : baseCols
  console.log("Loading shops…")
  const all = await fetchAll(supabase, "shops", cols)
  const active = all.filter((s) => s.is_active === true)
  const inactive = all.filter((s) => s.is_active !== true)
  const noCoords = active.filter((s) => !coords(s)).length
  const noState = active.filter((s) => isEmptyValue(s.state)).length
  console.log(`  ${active.length} active (${noCoords} without coordinates, ${noState} without state), ${inactive.length} inactive\n`)

  if (ARGS.inputFinal) {
    if (mode !== "insert") {
      console.error("--input-final requires --mode=insert")
      process.exit(1)
    }
    await insertFinal(supabase, ARGS.inputFinal, all, active)
    return
  }

  const overture = readCsv(OVERTURE_CSV).map((r) => overturePlace(r, "overture"))
  const overtureClosed = fs.existsSync(OVERTURE_CLOSED_CSV)
    ? readCsv(OVERTURE_CLOSED_CSV).map((r) => overturePlace(r, "overture-closed"))
    : []
  const fsq = ARGS.withFsq && mode !== "insert" ? readCsv(FSQ_CSV).map(fsqPlace) : []
  console.log(`Overture: ${overture.length} rows (+ ${overtureClosed.length} permanently closed)${fsq.length ? `, Foursquare: ${fsq.length}` : ""}\n`)

  // Rows already linked on a previous run (overture_id on any shop) are never re-matched or re-inserted.
  const linked = new Map<string, Row>()
  for (const s of all) if (s.overture_id) linked.set(String(s.overture_id), s)

  const matcher = new ShopMatcher(active)
  const claimed = new Set<string>(active.filter((s) => s.overture_id).map((s) => String(s.id)))
  const fresh = (p: Place) => !linked.has(p.id)

  const ov = assign([...overture, ...overtureClosed].filter(fresh), matcher, claimed)
  const fs4 = assign(fsq, matcher, new Set())
  const alreadyLinked = [...overture, ...overtureClosed].filter((p) => !fresh(p))

  const phoneReviewRows = [...ov.phoneReview, ...fs4.phoneReview].map(({ place: p, cand }) => ({
    shop_id: cand.shop.id,
    shop_name: cand.shop.name,
    overture_name: p.name,
    source: p.source,
    source_id: p.id,
    name_similarity: similarity(matchName(p.name), matchName(cand.shop.name)).toFixed(2),
    distance_m: Math.round(cand.distance),
    phone: formatPhone(cand.shop.phone),
    would_fill: [...Object.keys(fillPatch(cand.shop, p, {})), ...(p.source !== "fsq" ? ["overture_id"] : [])].join(" "),
  }))
  console.log(`Wrote ${writeCsv("data/overture-phone-review.csv", ["shop_id", "shop_name", "overture_name", "source", "source_id", "name_similarity", "distance_m", "phone", "would_fill"], phoneReviewRows)}`)
  console.log(`Wrote ${writeCsv("data/overture-ambiguous.csv", Object.keys(ov.ambiguous[0] ?? fs4.ambiguous[0] ?? { source: 1 }), [...ov.ambiguous, ...fs4.ambiguous])}`)

  // ── Enrich: blank-filling + closures on matched shops ──
  const patches = new Map<string, { shop: Row; patch: Row }>()
  const patchFor = (shop: Row) => {
    const id = String(shop.id)
    if (!patches.has(id)) patches.set(id, { shop, patch: {} })
    return patches.get(id)!.patch
  }
  const filled: Record<string, Record<string, number>> = { overture: {}, fsq: {} }
  const closures: Row[] = []
  let closedPhoneOnly = 0
  const fillStats = { coordsBlocked: 0 }
  const matchesOut: Row[] = []

  const flagClosed = (shop: Row, p: Place, why: string) => {
    const patch = patchFor(shop)
    if (shop.possibly_closed === true || patch.possibly_closed === true) return
    patch.possibly_closed = true
    closures.push({ shop_id: shop.id, shop_name: shop.name, city: shop.city, state: shop.state, source: p.source, source_id: p.id, source_name: p.name, reason: why })
  }

  if (mode !== "insert") {
    for (const { place: p, cand } of ov.assigned) {
      const patch = patchFor(cand.shop)
      if (isEmptyValue(cand.shop.overture_id)) patch.overture_id = p.id
      // A closed row matched only by phone is usually the previous business at
      // that address (phone carried over on a rename) — don't flag the current one.
      if (p.closed && cand.via === "phone≤500m") closedPhoneOnly++
      else if (p.closed) flagClosed(cand.shop, p, "Overture operating_status permanently_closed")
      else {
        const fill = fillPatch(cand.shop, p, patch, fillStats)
        for (const f of Object.keys(fill)) filled.overture[f] = (filled.overture[f] ?? 0) + 1
        Object.assign(patch, fill)
      }
      matchesOut.push({ source: p.source, source_id: p.id, source_name: p.name, shop_id: cand.shop.id, shop_name: cand.shop.name, via: cand.via, distance_m: Number.isFinite(cand.distance) ? Math.round(cand.distance) : "", filled: Object.keys(patch).join(" ") })
    }
    for (const { place: p, cand } of fs4.assigned) {
      const patch = patchFor(cand.shop)
      if (p.closed && cand.via !== "phone≤500m") flagClosed(cand.shop, p, "Foursquare date_closed set")
      const fill = fillPatch(cand.shop, p, patch, fillStats)
      for (const f of Object.keys(fill)) filled.fsq[f] = (filled.fsq[f] ?? 0) + 1
      Object.assign(patch, fill)
    }
    console.log(`Wrote ${writeCsv("data/possibly-closed.csv", ["shop_id", "shop_name", "city", "state", "source", "source_id", "source_name", "reason"], closures)}`)
    console.log(`Wrote ${writeCsv("data/overture-matches.csv", ["source", "source_id", "source_name", "shop_id", "shop_name", "via", "distance_m", "filled"], matchesOut)}`)
  }

  // Columns the DB doesn't have yet can't be written; in dry-run they're
  // still planned (and reported) so the numbers show what --apply will do.
  const updates = Array.from(patches.values()).filter((u) => Object.keys(u.patch).length > 0)
  const coordsRecovered = updates.filter((u) => u.patch.latitude != null).length
  const statesRecovered = updates.filter((u) => u.patch.state != null)

  // ── Insert: unmatched Overture rows ──
  const inactiveGrid = new GridIndex<[number, number]>(0.01, 0.015)
  for (const s of inactive) {
    const c = coords(s)
    if (c) inactiveGrid.add(c[0], c[1], c)
  }
  // Fails regardless of tier.
  const baseSkip = (p: Place): string | null => {
    if (!p.state) return "noState"
    if (p.lat == null || p.lng == null) return "noCoords"
    if (p.status === "temporarily_closed") return "temporarilyClosed"
    if (inactiveGrid.near(p.lat, p.lng).some(([lat, lng]) => haversineMeters(p.lat!, p.lng!, lat, lng) <= INACTIVE_RADIUS_M))
      return "nearInactive"
    return null
  }
  // Permanently closed rows never become shops.
  const pool = mode === "enrich" ? [] : ov.unmatched.filter((p) => p.source === "overture")
  const baseReason = new Map(pool.map((p) => [p.id, baseSkip(p)]))
  const reportRow = (p: Place, r: Row) => ({ ...r, confidence: p.confidence.toFixed(3), sources: p.datasets.join(" ") })

  const before: Record<string, number> = {}
  for (const s of active) {
    const st = stateCode(s.state)
    if (st) before[st] = (before[st] ?? 0) + 1
  }
  const pct = (n: number, b?: number) => (b ? `${((n / b) * 100).toFixed(0)}%` : "")

  if (ARGS.compareTiers) {
    compareTiers(pool, baseReason, active, all, before, reportRow)
    if (ov.phoneReview.length) console.log(`\n(${ov.phoneReview.length} weak phone-only rows are in data/overture-phone-review.csv and are excluded from every tier.)`)
    return
  }

  const crit: InsertCriteria = {
    minConfidence: MIN_CONFIDENCE,
    requireOpen: ARGS.requireOpen,
    requireStreet: ARGS.requireStreet,
    requireContact: ARGS.requireContact,
    minSources: ARGS.minSources,
  }
  const activeGrid = activeIndex(active)
  const skipped: Record<string, number> = {}
  const inserts: Row[] = []
  const review: Row[] = []
  const reviewByReason: Record<string, number> = {}
  const slugs = new Set(all.map((s) => String(s.slug ?? "")))
  for (const p of pool) {
    const why = baseReason.get(p.id) ?? tierSkip(p, crit) ?? (DROP_NAME.test(p.name) ? "droppedRemovalLaser" : null)
    if (why) { skipped[why] = (skipped[why] ?? 0) + 1; continue }
    const reasons = [
      REVIEW_BEAUTY.test(p.name) ? `beauty/pmu name (${p.name.match(REVIEW_BEAUTY)![0].toLowerCase()})` : null,
      handleLike(p.name) ? "handle-like name" : null,
      nearActive(activeGrid, p.lat!, p.lng!) ? `≤${TIER_NEAR_ACTIVE_M}m of an active shop` : null,
    ].filter((r): r is string => !!r)
    if (reasons.length) {
      for (const r of reasons) {
        const key = r.replace(/ \(.*\)$/, "")
        reviewByReason[key] = (reviewByReason[key] ?? 0) + 1
      }
      review.push({ reason: reasons.join("; "), overture_id: p.id, name: p.name, address: p.address, city: p.city, state: p.state, phone: formatPhone(p.phones[0]), website: p.website, confidence: p.confidence.toFixed(3) })
      continue
    }
    inserts.push(reportRow(p, insertRecord(p, slugs)))
  }
  if (mode !== "enrich") {
    console.log(`Wrote ${writeCsv("data/overture-insert-review.csv", ["reason", "overture_id", "name", "address", "city", "state", "phone", "website", "confidence"], review)}`)
    console.log(`Wrote ${writeCsv(ARGS.output ?? "data/overture-new-shops.csv", NEW_SHOP_HEADERS, inserts)}`)
  }
  console.log("")

  // ── Apply ──
  if (ARGS.apply) {
    const undo = new UndoLog("match-open-data")
    let done = 0
    await runPool(updates, 10, async (u) => {
      await loggedUpdate(supabase, undo, "shops", String(u.shop.id), u.shop, u.patch)
      if (++done % 500 === 0) console.log(`  updated ${done}/${updates.length}`)
    })
    if (mode !== "insert") console.log(`Updated ${done} shops`)
    const inserted = await insertRows(supabase, undo, inserts)
    if (mode !== "enrich") console.log(`Inserted ${inserted} shops`)
    console.log(`Undo log: ${undo.file} (${undo.entries} entries)\n`)
  }

  // ── Report ──
  const verb = ARGS.apply ? "" : " (would be)"
  const byVia: Record<string, number> = {}
  for (const a of ov.assigned) byVia[a.cand.via] = (byVia[a.cand.via] ?? 0) + 1
  console.log(`══ Report${ARGS.apply ? "" : " — DRY RUN"} (mode ${mode}) ══\n`)
  console.log(`Overture rows matched to an active shop: ${ov.assigned.length}  ${JSON.stringify(byVia)}`)
  console.log(`  already linked on a previous run:      ${alreadyLinked.length}`)
  console.log(`  matched a shop another row took first:  ${ov.lostToBetter.length} (treated as duplicates — no fill, no insert)`)
  console.log(`  rows that qualified for >1 shop:        ${new Set(ov.ambiguous.map((r) => r.source_id)).size} (see data/overture-ambiguous.csv)`)
  console.log(`Phone-only matches: ${byVia["phone≤500m"] ?? 0} kept, ${ov.phoneReview.length} sent to review (name similarity < ${PHONE_REVIEW_SIMILARITY}; data/overture-phone-review.csv)`)
  if (fsq.length) console.log(`Foursquare rows matched: ${fs4.assigned.length} (+${fs4.lostToBetter.length} duplicates, ${fs4.phoneReview.length} to phone review)`)

  if (mode !== "insert") {
    console.log(`\nFields filled${verb} per column:`)
    console.log(`  ${"column".padEnd(15)} ${"overture".padStart(9)}${fsq.length ? " foursquare".padStart(11) : ""}`)
    for (const f of FILL_FIELDS) {
      console.log(`  ${f.padEnd(15)} ${String(filled.overture[f] ?? 0).padStart(9)}${fsq.length ? String(filled.fsq[f] ?? 0).padStart(11) : ""}`)
    }
    console.log(`  ${"overture_id".padEnd(15)} ${String(updates.filter((u) => u.patch.overture_id).length).padStart(9)}`)
    console.log(`\nCoordinates recovered: ${coordsRecovered} of ${noCoords} (blocked, shop state ≠ source region: ${fillStats.coordsBlocked})`)
    console.log(`States recovered:      ${statesRecovered.length} of ${noState}`)
    console.log(`Possibly closed${verb}: ${closures.length} (not flagged: ${closedPhoneOnly} closed rows matched by phone only)`)
    console.log(`Shops updated${verb}: ${updates.length}`)
  }

  if (mode === "enrich") {
    if (!ARGS.apply) console.log("\nDry run — nothing written. Pass --apply to write (undo-logged).")
    return
  }

  const newByState: Record<string, number> = {}
  for (const r of inserts) newByState[String(r.state)] = (newByState[String(r.state)] ?? 0) + 1
  console.log(`\nNew shops${verb}: ${inserts.length} (${JSON.stringify(crit)})`)
  for (const [why, n] of Object.entries(skipped).sort((a, b) => b[1] - a[1])) console.log(`  skipped, ${why.padEnd(18)} ${n}`)

  const gained: Record<string, number> = {}
  for (const u of statesRecovered) {
    const st = stateCode(u.patch.state)
    if (st) gained[st] = (gained[st] ?? 0) + 1
  }
  console.log(`\nActive shops per state, before → after${verb}:`)
  console.log(`  ${"st".padEnd(3)} ${"before".padStart(7)} ${"+new".padStart(5)} ${"+state".padStart(6)} ${"after".padStart(7)} ${"bench".padStart(6)} ${"cov before".padStart(10)} ${"cov after".padStart(9)}`)
  let tb = 0, tn = 0, tg = 0
  for (const st of statesBenchmarkFirst()) {
    const b = before[st] ?? 0, n = newByState[st] ?? 0, g = gained[st] ?? 0
    tb += b; tn += n; tg += g
    const bench = BENCHMARKS[st]
    console.log(`  ${st.padEnd(3)} ${String(b).padStart(7)} ${String(n).padStart(5)} ${String(g).padStart(6)} ${String(b + n + g).padStart(7)} ${String(bench ?? "").padStart(6)} ${pct(b, bench).padStart(10)} ${pct(b + n + g, bench).padStart(9)}`)
  }
  console.log(`  ${"all".padEnd(3)} ${String(tb).padStart(7)} ${String(tn).padStart(5)} ${String(tg).padStart(6)} ${String(tb + tn + tg).padStart(7)}`)
  console.log(`\nTotal active: ${active.length} → ${active.length + inserts.length}`)
  console.log(`\nSent to review (data/overture-insert-review.csv): ${review.length} rows`)
  for (const [r, n] of Object.entries(reviewByReason).sort((a, b) => b[1] - a[1])) console.log(`  ${r.padEnd(26)} ${n}`)
  printInsertSummary(inserts, before, active.length)
  if (!ARGS.apply) console.log("\nDry run — nothing written. Pass --apply to write (undo-logged).")
}

function activeIndex(active: Row[]): GridIndex<[number, number]> {
  const grid = new GridIndex<[number, number]>(0.01, 0.015)
  for (const s of active) {
    const c = coords(s)
    if (c) grid.add(c[0], c[1], c)
  }
  return grid
}

function nearActive(grid: GridIndex<[number, number]>, lat: number, lng: number): boolean {
  return grid.near(lat, lng).some(([a, b]) => haversineMeters(lat, lng, a, b) <= TIER_NEAR_ACTIVE_M)
}

// Inserts in batches; each batch is undo-logged (is_active false → true, so
// undo deactivates rather than deletes) before it's written.
async function insertRows(supabase: SupabaseClient, undo: UndoLog, rows: Row[]): Promise<number> {
  let inserted = 0
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const batch = rows.slice(i, i + INSERT_BATCH).map((r) => {
      const row: Row = { ...r, ...INSERT_DEFAULTS }
      for (const k of REPORT_ONLY) delete row[k]
      return row
    })
    undo.append(batch.map((r) => ({ table: "shops", id: String(r.id), field: "is_active", old_value: false, new_value: true })))
    const { error } = await supabase.from("shops").insert(batch)
    if (error) throw new Error(`insert batch ${i / INSERT_BATCH + 1} failed: ${error.message}`)
    inserted += batch.length
  }
  return inserted
}

// National count, benchmark-state coverage and a 25-row sample of an insert set.
function printInsertSummary(rows: Row[], before: Record<string, number>, activeTotal: number): void {
  const byState: Record<string, number> = {}
  for (const r of rows) byState[String(r.state)] = (byState[String(r.state)] ?? 0) + 1
  console.log(`\nFinal insert set: ${rows.length} → active total ${activeTotal + rows.length}`)
  console.log(`  ${"st".padEnd(3)} ${"bench".padStart(6)} ${"now".padStart(5)} ${"cov".padStart(5)} ${"+new".padStart(5)} ${"after".padStart(6)} ${"cov".padStart(5)}`)
  for (const [st, bench] of Object.entries(BENCHMARKS)) {
    const b = before[st] ?? 0, n = byState[st] ?? 0
    const cov = (x: number) => `${Math.round((x / bench) * 100)}%`
    console.log(`  ${st.padEnd(3)} ${String(bench).padStart(6)} ${String(b).padStart(5)} ${cov(b).padStart(5)} ${("+" + n).padStart(5)} ${String(b + n).padStart(6)} ${cov(b + n).padStart(5)}`)
  }
  let seed = 7
  const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
  const copy = rows.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  console.log(`\n25 random rows (name | address | city | state | phone | website | confidence):`)
  for (const r of copy.slice(0, 25))
    console.log(`  ${r.name} | ${r.address ?? ""} | ${r.city ?? ""} | ${r.state} | ${r.phone ?? ""} | ${r.website ?? ""} | ${r.confidence}`)
}

// --input-final: insert exactly the rows of a previously written final set.
async function insertFinal(supabase: SupabaseClient, file: string, all: Row[], active: Row[]): Promise<void> {
  const rows = readCsv(file)
  const usedOverture = new Set(all.filter((s) => s.overture_id).map((s) => String(s.overture_id)))
  const usedSlugs = new Set(all.map((s) => String(s.slug ?? "")))
  const grid = activeIndex(active)
  const skips = { overtureIdUsed: 0, slugUsed: 0, nearActive: 0 }
  const toInsert: Row[] = []
  for (const r of rows) {
    const lat = parseFloat(r.latitude as string)
    const lng = parseFloat(r.longitude as string)
    if (usedOverture.has(String(r.overture_id))) { skips.overtureIdUsed++; continue }
    if (usedSlugs.has(String(r.slug))) { skips.slugUsed++; continue }
    if (nearActive(grid, lat, lng)) { skips.nearActive++; continue }
    const row: Row = {}
    for (const h of NEW_SHOP_HEADERS) row[h] = r[h] === "" || r[h] == null ? null : r[h]
    row.latitude = lat
    row.longitude = lng
    usedOverture.add(String(r.overture_id))
    usedSlugs.add(String(r.slug))
    toInsert.push(row)
  }
  console.log(`${file}: ${rows.length} rows`)
  console.log(`  skipped, overture_id already used: ${skips.overtureIdUsed}`)
  console.log(`  skipped, slug already used:        ${skips.slugUsed}`)
  console.log(`  skipped, now ≤${TIER_NEAR_ACTIVE_M}m of an active shop: ${skips.nearActive}`)
  console.log(`  to insert: ${toInsert.length}`)
  if (ARGS.apply) {
    const undo = new UndoLog("match-open-data-insert")
    const n = await insertRows(supabase, undo, toInsert)
    console.log(`Inserted ${n} shops. Undo log: ${undo.file} (${undo.entries} entries)`)
  } else {
    console.log("\nDry run — nothing written. Pass --apply to write (undo-logged).")
  }
}

function statesBenchmarkFirst(): string[] {
  return Array.from(US_STATES_PLUS_DC).sort((a, b) => {
    const ba = BENCHMARKS[a] != null, bb = BENCHMARKS[b] != null
    return ba !== bb ? (ba ? -1 : 1) : a.localeCompare(b)
  })
}

// ── Tier comparison (report only) ────────────────────────────────────────────

function compareTiers(
  pool: Place[],
  baseReason: Map<string, string | null>,
  active: Row[],
  all: Row[],
  before: Record<string, number>,
  reportRow: (p: Place, r: Row) => Row
): void {
  const activeGrid = new GridIndex<[number, number]>(0.01, 0.015)
  for (const s of active) {
    const c = coords(s)
    if (c) activeGrid.add(c[0], c[1], c)
  }
  const nearActive = (p: Place) =>
    activeGrid.near(p.lat!, p.lng!).some(([lat, lng]) => haversineMeters(p.lat!, p.lng!, lat, lng) <= TIER_NEAR_ACTIVE_M)

  const eligible = pool.filter((p) => !baseReason.get(p.id))
  const inAnyTier = new Set<string>()
  const results = TIERS.map((t) => {
    const rows = eligible.filter((p) => !tierSkip(p, t.crit))
    rows.forEach((p) => inAnyTier.add(p.id))
    const slugs = new Set(all.map((s) => String(s.slug ?? "")))
    const records = rows.map((p) => reportRow(p, insertRecord(p, slugs)))
    console.log(`Wrote ${writeCsv(`data/overture-new-${t.name}.csv`, NEW_SHOP_HEADERS, records)}`)
    const byState: Record<string, number> = {}
    for (const p of rows) byState[p.state!] = (byState[p.state!] ?? 0) + 1
    return {
      ...t,
      rows,
      records,
      byState,
      noShopWord: rows.filter((p) => !SHOP_WORD.test(p.name)).length,
      near50: rows.filter(nearActive).length,
    }
  })

  // 40-row sample of T1, deterministic.
  let seed = 42
  const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
  const t1 = results[0].records.slice()
  for (let i = t1.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[t1[i], t1[j]] = [t1[j], t1[i]]
  }
  console.log(`Wrote ${writeCsv("data/overture-sample-T1.csv", ["name", "address", "city", "state", "phone", "website", "confidence", "sources"], t1.slice(0, 40))}`)

  // Everything not inserted by any tier, with the first reason T1's rules (or the base rules) rejected it.
  const holdback = pool
    .filter((p) => !inAnyTier.has(p.id))
    .map((p) => ({
      overture_id: p.id, name: p.name, address: p.address, city: p.city, state: p.state, zip: p.zip,
      phone: formatPhone(p.phones[0]), website: p.website, confidence: p.confidence.toFixed(3),
      operating_status: p.status, sources: p.datasets.join(" "),
      reason: baseReason.get(p.id) ?? tierSkip(p, TIERS[3].crit) ?? tierSkip(p, TIERS[0].crit),
    }))
  console.log(`Wrote ${writeCsv("data/overture-holdback.csv", Object.keys(holdback[0] ?? { overture_id: 1 }), holdback)}\n`)

  const activeTotal = active.length
  const w = 16
  const cell = (s: string | number) => String(s).padStart(w)
  console.log(`══ Insert tier comparison — DRY RUN ══\n`)
  console.log(`Pool: ${pool.length} unmatched Overture rows; ${eligible.length} pass the base rules (valid state + coords, not temporarily closed, not ≤${INACTIVE_RADIUS_M}m of an inactive shop)\n`)
  console.log(`${"".padEnd(26)}${cell("now")}${results.map((r) => cell(r.name)).join("")}`)
  console.log(`${"".padEnd(26)}${cell("")}${results.map((r) => cell(r.label.length > w - 1 ? r.label.slice(0, w - 2) + "…" : r.label)).join("")}`)
  console.log(`${"New shops (national)".padEnd(26)}${cell("—")}${results.map((r) => cell(r.rows.length)).join("")}`)
  console.log(`${"Active total after".padEnd(26)}${cell(activeTotal)}${results.map((r) => cell(activeTotal + r.rows.length)).join("")}`)
  console.log(`${"No shop-like word in name".padEnd(26)}${cell("—")}${results.map((r) => cell(r.noShopWord)).join("")}`)
  console.log(`${`≤${TIER_NEAR_ACTIVE_M}m of any active shop`.padEnd(26)}${cell("—")}${results.map((r) => cell(r.near50)).join("")}`)
  console.log(`\n${"State (benchmark)".padEnd(26)}${cell("now cov")}${results.map((r) => cell(`+new  cov`)).join("")}`)
  for (const st of Object.keys(BENCHMARKS)) {
    const b = before[st] ?? 0
    const bench = BENCHMARKS[st]
    const cov = (n: number) => `${Math.round((n / bench) * 100)}%`
    console.log(
      `${`${st} (${bench})`.padEnd(26)}${cell(`${b}  ${cov(b)}`)}${results
        .map((r) => cell(`+${r.byState[st] ?? 0}  ${cov(b + (r.byState[st] ?? 0))}`))
        .join("")}`
    )
  }
  const literal2 = eligible.filter((p) => !tierSkip(p, { ...TIERS[1].crit, minSources: null }) && p.rawDatasets >= 2).length
  console.log(`\nT2 counts independent datasets only. Counting Overture's own "Overture"/"Overture-signals" entries too, T2 would be ${literal2} (≈ T1).`)
  console.log(`Holdback (in no tier): ${holdback.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
