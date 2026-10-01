// match-open-data.ts
// Matches Overture (and optionally Foursquare) tattoo places from
// scripts/overture/fetch.ts against ACTIVE shops, fills blank fields on
// matches, flags possible closures, and inserts unmatched Overture rows as
// new shops. Never deletes rows, never deactivates, never overwrites a
// non-null value.
// Run: npx tsx scripts/match-open-data.ts [--apply] [--min-confidence 0.7] [--with-fsq]
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
  }
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

// One shop per place (closest), one place per shop (closest, then highest
// confidence). Returns assignments, places that lost their shop to a better
// claimant, and ambiguity rows.
function assign(places: Place[], matcher: ShopMatcher, claimed: Set<string>) {
  const proposals: Assignment[] = []
  const ambiguous: Row[] = []
  const unmatched: Place[] = []
  for (const p of places) {
    const cands = matcher.candidates(p)
    if (!cands.length) { unmatched.push(p); continue }
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
  return { assigned, lostToBetter, ambiguous, unmatched }
}

// Blank-only patch for a matched shop. `pending` holds values already planned
// for this shop by an earlier source, so Foursquare never overrides Overture.
function fillPatch(shop: Row, p: Place, pending: Row): Row {
  const patch: Row = {}
  const blank = (f: string) => isEmptyValue(shop[f]) && isEmptyValue(pending[f])
  if (!coords(shop) && isEmptyValue(pending.latitude) && p.lat != null && p.lng != null) {
    patch.latitude = p.lat
    patch.longitude = p.lng
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

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  modeBanner(ARGS.apply)
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

  const overture = readCsv(OVERTURE_CSV).map((r) => overturePlace(r, "overture"))
  const overtureClosed = fs.existsSync(OVERTURE_CLOSED_CSV)
    ? readCsv(OVERTURE_CLOSED_CSV).map((r) => overturePlace(r, "overture-closed"))
    : []
  const fsq = ARGS.withFsq ? readCsv(FSQ_CSV).map(fsqPlace) : []
  console.log(`Overture: ${overture.length} rows (+ ${overtureClosed.length} permanently closed)${ARGS.withFsq ? `, Foursquare: ${fsq.length}` : ""}\n`)

  // Rows already linked on a previous run (overture_id on any shop) are never re-matched or re-inserted.
  const linked = new Map<string, Row>()
  for (const s of all) if (s.overture_id) linked.set(String(s.overture_id), s)

  const matcher = new ShopMatcher(active)
  const claimed = new Set<string>(active.filter((s) => s.overture_id).map((s) => String(s.id)))
  const fresh = (p: Place) => !linked.has(p.id)

  const ov = assign([...overture, ...overtureClosed].filter(fresh), matcher, claimed)
  const fs4 = assign(fsq, matcher, new Set())
  const alreadyLinked = [...overture, ...overtureClosed].filter((p) => !fresh(p))

  // ── Build patches ──
  const patches = new Map<string, { shop: Row; patch: Row }>()
  const patchFor = (shop: Row) => {
    const id = String(shop.id)
    if (!patches.has(id)) patches.set(id, { shop, patch: {} })
    return patches.get(id)!.patch
  }
  const filled: Record<string, Record<string, number>> = { overture: {}, fsq: {} }
  const closures: Row[] = []
  let closedPhoneOnly = 0
  const matchesOut: Row[] = []

  const flagClosed = (shop: Row, p: Place, why: string) => {
    const patch = patchFor(shop)
    if (shop.possibly_closed === true || patch.possibly_closed === true) return
    patch.possibly_closed = true
    closures.push({ shop_id: shop.id, shop_name: shop.name, city: shop.city, state: shop.state, source: p.source, source_id: p.id, source_name: p.name, reason: why })
  }

  for (const { place: p, cand } of ov.assigned) {
    const patch = patchFor(cand.shop)
    if (isEmptyValue(cand.shop.overture_id)) patch.overture_id = p.id
    // A closed row matched only by phone is usually the previous business at
    // that address (phone carried over on a rename) — don't flag the current one.
    if (p.closed && cand.via === "phone≤500m") closedPhoneOnly++
    else if (p.closed) flagClosed(cand.shop, p, "Overture operating_status permanently_closed")
    else {
      const fill = fillPatch(cand.shop, p, patch)
      for (const f of Object.keys(fill)) filled.overture[f] = (filled.overture[f] ?? 0) + 1
      Object.assign(patch, fill)
    }
    matchesOut.push({ source: p.source, source_id: p.id, source_name: p.name, shop_id: cand.shop.id, shop_name: cand.shop.name, via: cand.via, distance_m: Number.isFinite(cand.distance) ? Math.round(cand.distance) : "", filled: Object.keys(patch).join(" ") })
  }
  for (const { place: p, cand } of fs4.assigned) {
    const patch = patchFor(cand.shop)
    if (p.closed && cand.via !== "phone≤500m") flagClosed(cand.shop, p, "Foursquare date_closed set")
    const fill = fillPatch(cand.shop, p, patch)
    for (const f of Object.keys(fill)) filled.fsq[f] = (filled.fsq[f] ?? 0) + 1
    Object.assign(patch, fill)
  }

  // Columns the DB doesn't have yet can't be written; in dry-run they're
  // still planned (and reported) so the numbers show what --apply will do.
  const updates = Array.from(patches.values()).filter((u) => Object.keys(u.patch).length > 0)
  const coordsRecovered = updates.filter((u) => u.patch.latitude != null).length
  const statesRecovered = updates.filter((u) => u.patch.state != null)

  // ── New shops ──
  const inactiveGrid = new GridIndex<[number, number]>(0.01, 0.015)
  for (const s of inactive) {
    const c = coords(s)
    if (c) inactiveGrid.add(c[0], c[1], c)
  }
  const slugs = new Set(all.map((s) => String(s.slug ?? "")))
  const skipped = { lowConfidence: 0, removedDuplicate: 0, noState: 0, noCoords: 0, temporarilyClosed: 0 }
  const inserts: Row[] = []
  for (const p of ov.unmatched) {
    if (p.source !== "overture") continue // permanently closed rows never become shops
    if (p.confidence < MIN_CONFIDENCE) { skipped.lowConfidence++; continue }
    if (!p.state) { skipped.noState++; continue }
    if (p.lat == null || p.lng == null) { skipped.noCoords++; continue }
    if (p.status === "temporarily_closed") { skipped.temporarilyClosed++; continue }
    if (inactiveGrid.near(p.lat, p.lng).some(([lat, lng]) => haversineMeters(p.lat!, p.lng!, lat, lng) <= INACTIVE_RADIUS_M)) {
      skipped.removedDuplicate++
      continue
    }
    const base = [slugify(p.name), p.city ? slugify(p.city) : "", p.state.toLowerCase()].filter(Boolean).join("-")
    let slug = base
    for (let n = 2; slugs.has(slug); n++) slug = `${base}-${n}`
    slugs.add(slug)
    const tail = [p.city, [p.state, p.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")
    inserts.push({
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
      confidence: p.confidence, // report only — stripped before insert
    })
  }

  // ── CSV reports ──
  console.log(`Wrote ${writeCsv("data/overture-ambiguous.csv", Object.keys(ov.ambiguous[0] ?? fs4.ambiguous[0] ?? { source: 1 }), [...ov.ambiguous, ...fs4.ambiguous])}`)
  console.log(`Wrote ${writeCsv("data/possibly-closed.csv", ["shop_id", "shop_name", "city", "state", "source", "source_id", "source_name", "reason"], closures)}`)
  console.log(`Wrote ${writeCsv("data/overture-matches.csv", ["source", "source_id", "source_name", "shop_id", "shop_name", "via", "distance_m", "filled"], matchesOut)}`)
  console.log(`Wrote ${writeCsv("data/overture-new-shops.csv", ["id", "name", "slug", "address", "city", "state", "zip", "phone", "website", "latitude", "longitude", "overture_id", "confidence"], inserts)}\n`)

  // ── Apply ──
  if (ARGS.apply) {
    const undo = new UndoLog("match-open-data")
    let done = 0
    await runPool(updates, 10, async (u) => {
      await loggedUpdate(supabase, undo, "shops", String(u.shop.id), u.shop, u.patch)
      if (++done % 500 === 0) console.log(`  updated ${done}/${updates.length}`)
    })
    console.log(`Updated ${done} shops`)
    let inserted = 0
    for (let i = 0; i < inserts.length; i += INSERT_BATCH) {
      const batch = inserts.slice(i, i + INSERT_BATCH).map(({ confidence: _c, ...r }) => r)
      undo.append(batch.map((r) => ({ table: "shops", id: String(r.id), field: "is_active", old_value: false, new_value: true })))
      const { error } = await supabase.from("shops").insert(batch)
      if (error) throw new Error(`insert batch ${i / INSERT_BATCH + 1} failed: ${error.message}`)
      inserted += batch.length
    }
    console.log(`Inserted ${inserted} shops`)
    console.log(`Undo log: ${undo.file} (${undo.entries} entries)\n`)
  }

  // ── Report ──
  const verb = ARGS.apply ? "" : " (would be)"
  const byVia: Record<string, number> = {}
  for (const a of ov.assigned) byVia[a.cand.via] = (byVia[a.cand.via] ?? 0) + 1
  console.log(`══ Report${ARGS.apply ? "" : " — DRY RUN"} ══\n`)
  console.log(`Overture rows matched to an active shop: ${ov.assigned.length}  ${JSON.stringify(byVia)}`)
  console.log(`  already linked on a previous run:      ${alreadyLinked.length}`)
  console.log(`  matched a shop another row took first:  ${ov.lostToBetter.length} (treated as duplicates — no fill, no insert)`)
  console.log(`  rows that qualified for >1 shop:        ${new Set(ov.ambiguous.map((r) => r.source_id)).size} (see data/overture-ambiguous.csv)`)
  if (ARGS.withFsq) console.log(`Foursquare rows matched: ${fs4.assigned.length} (+${fs4.lostToBetter.length} duplicates)`)

  console.log(`\nFields filled${verb} per column:`)
  console.log(`  ${"column".padEnd(15)} ${"overture".padStart(9)}${ARGS.withFsq ? " foursquare".padStart(11) : ""}`)
  for (const f of FILL_FIELDS) {
    console.log(`  ${f.padEnd(15)} ${String(filled.overture[f] ?? 0).padStart(9)}${ARGS.withFsq ? String(filled.fsq[f] ?? 0).padStart(11) : ""}`)
  }
  console.log(`  ${"overture_id".padEnd(15)} ${String(updates.filter((u) => u.patch.overture_id).length).padStart(9)}`)
  console.log(`\nCoordinates recovered: ${coordsRecovered} of ${noCoords}`)
  console.log(`States recovered:      ${statesRecovered.length} of ${noState}`)
  console.log(`Possibly closed${verb}: ${closures.length} (not flagged: ${closedPhoneOnly} closed rows matched by phone only)`)

  const newByState: Record<string, number> = {}
  for (const r of inserts) newByState[String(r.state)] = (newByState[String(r.state)] ?? 0) + 1
  console.log(`\nNew shops${verb}: ${inserts.length} (min confidence ${MIN_CONFIDENCE})`)
  console.log(`  skipped, confidence < ${MIN_CONFIDENCE}:          ${skipped.lowConfidence}`)
  console.log(`  skipped, ≤${INACTIVE_RADIUS_M}m of an inactive shop: ${skipped.removedDuplicate}`)
  console.log(`  skipped, temporarily closed:      ${skipped.temporarilyClosed}`)
  console.log(`  skipped, no valid state / coords: ${skipped.noState} / ${skipped.noCoords}`)

  // Before/after active shops per state.
  const before: Record<string, number> = {}
  for (const s of active) {
    const st = stateCode(s.state)
    if (st) before[st] = (before[st] ?? 0) + 1
  }
  const gained: Record<string, number> = {}
  for (const u of statesRecovered) {
    const st = stateCode(u.patch.state)
    if (st) gained[st] = (gained[st] ?? 0) + 1
  }
  const pct = (n: number, b?: number) => (b ? `${((n / b) * 100).toFixed(0)}%` : "")
  console.log(`\nActive shops per state, before → after${verb}:`)
  console.log(`  ${"st".padEnd(3)} ${"before".padStart(7)} ${"+new".padStart(5)} ${"+state".padStart(6)} ${"after".padStart(7)} ${"bench".padStart(6)} ${"cov before".padStart(10)} ${"cov after".padStart(9)}`)
  const states = Array.from(US_STATES_PLUS_DC).sort((a, b) => {
    const ba = BENCHMARKS[a] != null, bb = BENCHMARKS[b] != null
    return ba !== bb ? (ba ? -1 : 1) : a.localeCompare(b)
  })
  let tb = 0, tn = 0, tg = 0
  for (const st of states) {
    const b = before[st] ?? 0, n = newByState[st] ?? 0, g = gained[st] ?? 0
    tb += b; tn += n; tg += g
    const bench = BENCHMARKS[st]
    console.log(`  ${st.padEnd(3)} ${String(b).padStart(7)} ${String(n).padStart(5)} ${String(g).padStart(6)} ${String(b + n + g).padStart(7)} ${String(bench ?? "").padStart(6)} ${pct(b, bench).padStart(10)} ${pct(b + n + g, bench).padStart(9)}`)
  }
  console.log(`  ${"all".padEnd(3)} ${String(tb).padStart(7)} ${String(tn).padStart(5)} ${String(tg).padStart(6)} ${String(tb + tn + tg).padStart(7)}`)
  console.log(`\nTotal active: ${active.length} → ${active.length + inserts.length}`)
  if (!ARGS.apply) console.log("\nDry run — nothing written. Pass --apply to write (undo-logged).")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
