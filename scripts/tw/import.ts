// scripts/tw/import.ts — imports TattoosWizard data. Fetches nothing: it reads
// data/tw/profiles.jsonl and the match output (data/reports/tattooswizard-profiles.csv,
// from scripts/tw/match.ts) and checks them against the live database.
//
// Never deletes rows. Only fills empty fields; never overwrites real data.
//   1. Existing artists (artist_existing): Instagram handle when ours is empty or
//      junk, follower count (only when our handle is the profile's handle), and
//      styles when ours are empty.
//   2. Existing shops (studio_existing): only when the match key was Instagram or
//      the names agree. instagram_url when empty, follower count (only when the
//      shop's Instagram is the profile's), website and phone when empty. Failing
//      the name check → data/reports/tw-shop-review.csv.
//   3. New artists at shops we have (artist_new_shop_known, plus artists a studio
//      page lists): only when the shop match passes the same rule, or the artist
//      is on the roster of a studio that passed it. Probable matches go to the
//      review CSV. Skipped (and reported) when the shop already has an active
//      artist whose normalized name equals or contains theirs, or the other way
//      round. Inserted with is_active true, is_claimed false, source 'tattooswizard'.
//   4. Styles: main style, plus portfolio tags with ≥3 pieces and ≥15% of the
//      portfolio, mapped with matchStyleSlugs(), unmapped dropped, at most 4.
//
// "Names agree": normalized-name similarity ≥ 0.6 after removing generic words
// ("tattoo", "studio", "co", "llc", "and", "parlor", "shop" …) and the city name,
// or one normalized name contains the other.
//
// Run: npx tsx scripts/tw/import.ts [--apply]
//   Dry run by default: writes data/reports/tattooswizard-import-dryrun.json (the
//   plan), tattooswizard-import-report.md, tw-shop-review.csv and
//   tattooswizard-import-skipped.csv.
//   --apply recomputes and stops if anything differs from the dry-run plan, then
//   writes in batches of 500, undo-logged to data/undo/tattooswizard-import-<timestamp>.jsonl
//   (inserts are logged as is_active false → true, enrichments with their old value).
//   Undo: npx tsx scripts/tw/undo-import.ts --input <log> [--apply]

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import { randomUUID } from "crypto"
import { matchStyleSlugs, type StyleSlug } from "../../lib/styles"
import { getSupabaseAdmin } from "../lib/supabase-admin"
import { UndoLog } from "../lib/undo-log"
import { fetchAll, fetchIn, modeBanner, parseCSV, runPool, similarity, writeCsv } from "../lib/cleanup-utils"
import { withRetry } from "../lib/retry"
import { isPlaceholderName, normalizeArtistName } from "../lib/artist-names"
import { ARTIST_COLUMNS, SHOP_COLUMNS, buildGroups, milesBetween, toArtist, toShop, type Row } from "../lib/chain-artists"
import { PROFILES_FILE, REPORT_DIR, flag, readJsonl } from "./lib/common"
import { instagramHandle, type Profile } from "./lib/parse"
import { JUNK_HANDLES, dbHandle, nameKey, normDomain, normPhone, placeKey } from "./lib/normalize"
import { SUPPLY_SHOP, UNREADABLE, cleanName, coreName, isGenericName, makeHandle, namesAgree } from "./lib/names"

const APPLY = flag("--apply")
const SCRIPT = "tattooswizard-import"
const MATCH_FILE = path.join(REPORT_DIR, "tattooswizard-profiles.csv")
const PLAN_FILE = path.join(REPORT_DIR, "tattooswizard-import-dryrun.json")
const REPORT_FILE = path.join(REPORT_DIR, APPLY ? "tattooswizard-import-report.applied.md" : "tattooswizard-import-report.md")
const REVIEW_FILE = path.join(REPORT_DIR, "tw-shop-review.csv")
const SKIPPED_FILE = path.join(REPORT_DIR, "tattooswizard-import-skipped.csv")
const SHOP_PAGES_FILE = path.join(REPORT_DIR, "tw-shop-pages.csv")
const BATCH = 500
const MAX_STYLES = 4
const TAG_MIN_PIECES = 3
const TAG_MIN_SHARE = 0.15
// Spot-check point (Tampa) for the finder before/after.
const FINDER = { p_lat: 27.98, p_lng: -82.48, p_radius_mi: 25, p_styles: ["japanese"] }

type MatchRow = Record<string, string>
type DbArtist = Row & {
  id: string
  display_name: string
  handle: string | null
  instagram_handle: string | null
  styles: string[] | null
  shop_id: string | null
  instagram_followers: number | null
  instagram_checked_at: string | null
}
type DbShop = Row & {
  id: string
  name: string
  slug: string | null
  city: string | null
  state: string | null
  phone: string | null
  website: string | null
  instagram_url: string | null
  instagram_followers: number | null
  instagram_checked_at: string | null
  latitude: number | null
  longitude: number | null
  is_active: boolean
  possibly_closed: boolean
}

interface Update {
  table: "artists" | "shops"
  id: string
  name: string
  tw_url: string
  patch: Record<string, unknown>
  old: Record<string, unknown>
}
interface Insert {
  tw_url: string
  shop_id: string
  shop_name: string
  shop_was_empty: boolean
  via: string
  record: Record<string, unknown>
}
interface Review {
  kind: string
  reason: string
  tw_name: string
  tw_url: string
  tw_city: string
  followers: number | null
  our_shop_name: string
  our_shop_id: string
  our_shop_city: string
  match_key: string
  score: string
}
interface Skip {
  reason: string
  tw_name: string
  tw_url: string
  our_shop_name: string
  our_shop_id: string
  detail: string
}

// ---- rules ------------------------------------------------------------------

/** The style rule (step 4). Main style first, then strong portfolio tags. */
export function styleRule(p: Profile): StyleSlug[] {
  const out: StyleSlug[] = []
  const add = (raw: string | null) => {
    for (const s of raw ? matchStyleSlugs(raw) : []) if (!out.includes(s)) out.push(s)
  }
  add(p.main_style)
  const total = p.style_tags.reduce((n, t) => n + (t.count ?? 0), 0)
  const strong = p.style_tags
    .filter((t) => t.count !== null && t.count >= TAG_MIN_PIECES && total > 0 && t.count / total >= TAG_MIN_SHARE)
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
  for (const t of strong) add(t.style)
  return out.slice(0, MAX_STYLES)
}

// A profile named like a shop ("Black Dagger Tattoo") whose name agrees with
// the shop's is the shop's own page; supply/product/event accounts aren't artists.
const SHOP_WORDS = /\b(tattoos?|tattooing|studios?|piercing|parlou?r|collective|gallery|llc|inc|co|company)\b/i
const NOT_ARTIST = /\b(supply|supplies|products?|convention|expo|aftercare|care|dot com|magazine|academy|school|removal)\b|\.com\b/i


// Not artists, by hand (TattoosWizard usernames): a product company, a shop page.
const SKIP_PROFILES = new Set(["inkeeze", "nativeinktattoo"])


/**
 * "shop": the profile is the shop's own page — named like a shop ("Black Dagger
 * Tattoo") and the names agree. "unsure": near-identical names without a shop
 * word ("Sinnerman" / "Sinnerman Tattoo Company", but also "Kane Navasard" /
 * "Kane Navasard"), which may be a solo artist — held for review. A person's
 * name inside a longer shop name ("Tatu Baby" / "… by Tatubaby") is neither.
 */
function shopPageCheck(name: string, shopName: string, cities: (string | null)[]): "shop" | "unsure" | null {
  if (SHOP_WORDS.test(name) && namesAgree(name, shopName, cities) !== null) return "shop"
  const strip = (s: string) => s.replace(/^a(?=.{4})/, "").replace(/(art|arts|ink|gallery|collective)$/, "")
  const a = strip(coreName(name, cities))
  const b = strip(coreName(shopName, cities))
  return a && b && similarity(a, b) >= 0.8 ? "unsure" : null
}


/**
 * Ours is "junk": "instagram", "@", a URL with no handle in it, or link text
 * scraped as a handle ("View Instagram", "Bailey's Instagram") — anything that
 * neither is a handle nor contains one.
 */
function isJunkHandle(raw: string | null): boolean {
  const s = String(raw ?? "").trim()
  if (!s) return false
  if (/^@+$/.test(s) || JUNK_HANDLES.has(s.toLowerCase())) return true
  if (/instagram\.com\//i.test(s)) return dbHandle(s) === null
  return !/^@?[A-Za-z0-9._]{1,30}$/.test(s) || dbHandle(s) === null
}
const isEmpty = (v: unknown) => v == null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0)
const isIgKey = (key: string) => /instagram/.test(key)
const igUrl = (h: string) => `https://www.instagram.com/${h}`
const fmtPhone = (raw: string | null) => {
  const d = normPhone(raw)
  return d ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : null
}
const checkedAt = (p: Profile) => (p.followers_checked_at ? new Date(`${p.followers_checked_at.slice(0, 10)}T00:00:00Z`).toISOString() : null)


// ---- plan -------------------------------------------------------------------

async function buildPlan(supabase: ReturnType<typeof getSupabaseAdmin>) {
  if (!fs.existsSync(MATCH_FILE)) throw new Error(`No match output at ${MATCH_FILE}. Run scripts/tw/match.ts first.`)
  const profiles = readJsonl<Profile>(PROFILES_FILE)
  const byUrl = new Map(profiles.map((p) => [p.url, p]))
  const matchRows = parseCSV(fs.readFileSync(MATCH_FILE, "utf-8")) as MatchRow[]
  const matchByUrl = new Map(matchRows.map((r) => [r.profile_url, r]))
  const missing = matchRows.filter((r) => !byUrl.has(r.profile_url)).length
  if (missing) throw new Error(`${missing} match rows have no profile in ${PROFILES_FILE}; rerun match.ts.`)

  const artists = await withRetry("fetch active artists", () =>
    fetchAll<DbArtist>(supabase, "artists", `${ARTIST_COLUMNS}, handle, instagram_followers, instagram_checked_at, city, state`, (q) => q.eq("is_active", true)),
  )
  const allArtists = await withRetry("fetch all artist handles", () =>
    fetchAll<{ id: string; handle: string | null; instagram_handle: string | null; is_active: boolean }>(supabase, "artists", "id, handle, instagram_handle, is_active"),
  )
  const shopIds = Array.from(new Set([...matchRows.map((r) => r.matched_shop_id), ...artists.map((a) => a.shop_id)].filter((x): x is string => !!x)))
  const shops = await withRetry("fetch shops", () =>
    fetchIn<DbShop>(supabase, "shops", `${SHOP_COLUMNS}, slug, phone, website, instagram_url, instagram_followers, instagram_checked_at`, "id", shopIds),
  )
  const shopById = new Map(shops.map((s) => [s.id, s]))
  const artistById = new Map(artists.map((a) => [a.id, a]))
  const activeAtShop = new Map<string, DbArtist[]>()
  for (const a of artists) if (a.shop_id) activeAtShop.set(a.shop_id, [...(activeAtShop.get(a.shop_id) ?? []), a])
  const takenHandles = new Set(allArtists.map((a) => a.handle).filter((h): h is string => !!h))
  const igOwner = new Map<string, { id: string; active: boolean }>()
  for (const a of allArtists) {
    const h = dbHandle(a.instagram_handle)
    if (h && !(igOwner.get(h)?.active ?? false)) igOwner.set(h, { id: a.id, active: a.is_active })
  }

  const reviews: Review[] = []
  const skips: Skip[] = []
  const artistUpdates: Update[] = []
  const shopUpdates: Update[] = []
  const inserts: Insert[] = []
  const notes = {
    artistFollowersHandleDiffers: 0,
    artistHandleDiffers: 0,
    artistNoLongerActive: 0,
    artistMatchedTwice: 0,
    shopFollowersHandleDiffers: 0,
    shopNotActive: 0,
    shopMatchedTwice: 0,
  }
  const review = (kind: string, reason: string, p: Profile, r: MatchRow, shop: DbShop | undefined, score: number | null = null) =>
    reviews.push({
      kind,
      reason,
      tw_name: p.name ?? "",
      tw_url: p.url,
      tw_city: `${p.city ?? ""}, ${p.state ?? ""}`,
      followers: p.instagram_followers,
      our_shop_name: shop?.name ?? r.matched_shop_name ?? "",
      our_shop_id: shop?.id ?? r.matched_shop_id ?? "",
      our_shop_city: shop ? `${shop.city ?? ""}, ${shop.state ?? ""}` : r.matched_shop_city ?? "",
      match_key: r.match_key,
      score: score === null ? r.probable_score ?? "" : score.toFixed(2),
    })
  const skip = (reason: string, p: Profile, shop: DbShop | undefined, detail = "") =>
    skips.push({ reason, tw_name: p.name ?? "", tw_url: p.url, our_shop_name: shop?.name ?? "", our_shop_id: shop?.id ?? "", detail })

  // ---- 1. existing artists ----
  const existingRows = matchRows.filter((r) => r.status === "artist_existing")
  const byArtist = new Map<string, MatchRow[]>()
  for (const r of existingRows) byArtist.set(r.matched_artist_id, [...(byArtist.get(r.matched_artist_id) ?? []), r])
  for (const [artistId, rows] of byArtist) {
    let chosen = rows
    if (rows.length > 1) {
      // Two profiles on one artist: keep the one whose handle is ours, if exactly one is.
      const a = artistById.get(artistId)
      const own = rows.filter((r) => a && dbHandle(a.instagram_handle) === byUrl.get(r.profile_url)!.instagram_handle)
      chosen = own.length === 1 ? own : []
      notes.artistMatchedTwice += rows.length - chosen.length
    }
    for (const r of chosen) {
      const p = byUrl.get(r.profile_url)!
      const a = artistById.get(artistId)
      if (!a) {
        notes.artistNoLongerActive++
        continue
      }
      const patch: Record<string, unknown> = {}
      const ours = a.instagram_handle
      if (p.instagram_handle && (isEmpty(ours) || isJunkHandle(ours))) patch.instagram_handle = p.instagram_handle
      const effective = (patch.instagram_handle as string | undefined) ?? dbHandle(ours)
      if (effective && p.instagram_handle && effective !== p.instagram_handle) notes.artistHandleDiffers++
      if (p.instagram_followers !== null && effective === p.instagram_handle) {
        if (a.instagram_followers == null) patch.instagram_followers = p.instagram_followers
        if (a.instagram_checked_at == null && checkedAt(p)) patch.instagram_checked_at = checkedAt(p)
      } else if (p.instagram_followers !== null) notes.artistFollowersHandleDiffers++
      if (isEmpty(a.styles)) {
        const styles = styleRule(p)
        if (styles.length) patch.styles = styles
      }
      if (Object.keys(patch).length)
        artistUpdates.push({ table: "artists", id: a.id, name: a.display_name, tw_url: p.url, patch, old: Object.fromEntries(Object.keys(patch).map((k) => [k, a[k] ?? null])) })
    }
  }

  // ---- 2. existing shops ----
  const studioRows = matchRows.filter((r) => r.status === "studio_existing")
  const passedStudios = new Map<string, { r: MatchRow; p: Profile; shop: DbShop }>() // tw url →
  const studioPass: { r: MatchRow; p: Profile; shop: DbShop }[] = []
  for (const r of studioRows) {
    const p = byUrl.get(r.profile_url)!
    const shop = shopById.get(r.matched_shop_id)
    if (!shop || !shop.is_active) {
      notes.shopNotActive++
      continue
    }
    const agree = isIgKey(r.match_key) ? 1 : namesAgree(p.name, shop.name, [p.city, shop.city])
    if (agree === null) {
      const sim = similarity(coreName(p.name ?? "", [p.city, shop.city]), coreName(shop.name, [p.city, shop.city]))
      review("shop", "names don't agree", p, r, shop, sim)
      continue
    }
    studioPass.push({ r, p, shop })
  }
  const passByShop = new Map<string, typeof studioPass>()
  for (const s of studioPass) passByShop.set(s.shop.id, [...(passByShop.get(s.shop.id) ?? []), s])
  for (const [, list] of passByShop) {
    if (list.length > 1) {
      notes.shopMatchedTwice += list.length
      for (const s of list) review("shop", `${list.length} TattoosWizard studios matched this one shop`, s.p, s.r, s.shop)
      continue
    }
    const { p, shop } = list[0]
    passedStudios.set(p.url, list[0])
    const patch: Record<string, unknown> = {}
    if (p.instagram_handle && isEmpty(shop.instagram_url)) patch.instagram_url = igUrl(p.instagram_handle)
    const shopIg = instagramHandle((patch.instagram_url as string | undefined) ?? shop.instagram_url)
    if (p.instagram_followers !== null && shopIg === p.instagram_handle) {
      if (shop.instagram_followers == null) patch.instagram_followers = p.instagram_followers
      if (shop.instagram_checked_at == null && checkedAt(p)) patch.instagram_checked_at = checkedAt(p)
    } else if (p.instagram_followers !== null) notes.shopFollowersHandleDiffers++
    if (p.website && normDomain(p.website) && isEmpty(shop.website)) patch.website = p.website
    const phone = fmtPhone(p.phone)
    if (phone && isEmpty(shop.phone)) patch.phone = phone
    if (Object.keys(patch).length)
      shopUpdates.push({ table: "shops", id: shop.id, name: shop.name, tw_url: p.url, patch, old: Object.fromEntries(Object.keys(patch).map((k) => [k, shop[k] ?? null])) })
  }

  // ---- 3. new artists at shops we have ----
  // Candidates: artist_new_shop_known rows, plus artists a passed studio lists
  // (or whose page names that studio, as match.ts derives rosters).
  type Cand = { p: Profile; r: MatchRow; shop: DbShop | undefined; via: string; pass: boolean; score: number | null }
  const rosterOf = new Map<string, { shop: DbShop; studio: Profile }[]>() // artist url → passed studios listing them
  for (const { p: studio, shop } of passedStudios.values()) {
    const derived = profiles.filter(
      (a) =>
        a.is_studio !== true &&
        !a.parse_error &&
        ((a.studio_handle && (a.studio_handle === studio.username || a.studio_handle === studio.instagram_handle)) ||
          (a.studio_name && nameKey(a.studio_name) === nameKey(studio.name) && placeKey(a.city, a.state) === placeKey(studio.city, studio.state))),
    )
    for (const u of new Set([...studio.roster_urls, ...derived.map((a) => a.url)])) {
      const a = byUrl.get(u)
      if (!a || a.is_studio === true) continue
      rosterOf.set(u, [...(rosterOf.get(u) ?? []), { shop, studio }])
    }
  }
  const twStudioByHandle = new Map<string, Profile>()
  for (const s of profiles) if (s.is_studio === true) for (const h of [s.username, s.instagram_handle]) if (h) twStudioByHandle.set(h, s)

  const cands: Cand[] = []
  const NEW_STATUSES = new Set(["artist_new_shop_known", "artist_new_shop_probable", "artist_new_shop_missing", "artist_new_private"])
  for (const r of matchRows) {
    if (!NEW_STATUSES.has(r.status)) continue
    const p = byUrl.get(r.profile_url)!
    const roster = rosterOf.get(p.url) ?? []
    const rosterShops = Array.from(new Map(roster.map((x) => [x.shop.id, x])).values())
    if (rosterShops.length > 1) {
      skip("listed on more than one shop's roster", p, undefined, rosterShops.map((x) => x.shop.name).join(" | "))
      continue
    }
    const viaRoster = rosterShops[0]
    if (r.status === "artist_new_shop_known") {
      const shop = shopById.get(r.matched_shop_id)
      if (viaRoster && viaRoster.shop.id !== r.matched_shop_id) {
        skip("roster and own page point at different shops", p, shop, `roster: ${viaRoster.shop.name}`)
        continue
      }
      if (viaRoster) {
        cands.push({ p, r, shop, via: `roster of ${viaRoster.studio.name}`, pass: true, score: null })
        continue
      }
      if (isIgKey(r.match_key)) {
        cands.push({ p, r, shop, via: r.match_key, pass: true, score: null })
        continue
      }
      // Names to compare with our shop: the studio named on their page, the
      // studio's own TW page, and (when their own phone/site hit) their own name.
      const studioPage = p.studio_handle ? twStudioByHandle.get(p.studio_handle) : undefined
      const names = [p.studio_name, studioPage?.name ?? null, r.match_key.startsWith("own ") ? p.name : null]
      let best: number | null = null
      for (const n of names) {
        const s = shop ? namesAgree(n, shop.name, [p.city, shop.city]) : null
        if (s !== null && (best === null || s > best)) best = s
      }
      cands.push({ p, r, shop, via: r.match_key, pass: best !== null, score: best })
    } else if (viaRoster) {
      cands.push({ p, r, shop: viaRoster.shop, via: `roster of ${viaRoster.studio.name}`, pass: true, score: null })
    } else if (r.status === "artist_new_shop_probable") {
      review("artist", "probable shop match", p, r, shopById.get(r.matched_shop_id))
    }
  }

  const shopPages: Record<string, unknown>[] = []
  const plannedAtShop = new Map<string, string[]>()
  const plannedIg = new Set<string>()
  const emptyShops = new Set<string>()
  for (const c of cands.sort((a, b) => (b.p.instagram_followers ?? -1) - (a.p.instagram_followers ?? -1) || a.p.url.localeCompare(b.p.url))) {
    const { p, shop } = c
    const name = cleanName(p.name ?? "")
    if (!c.pass) {
      review("artist", "shop names don't agree", p, c.r, shop, c.score)
      continue
    }
    if (!shop || !shop.is_active || shop.possibly_closed) {
      skip(!shop || !shop.is_active ? "shop not active" : "shop marked possibly closed", p, shop)
      continue
    }
    if (!name || isPlaceholderName(name) || isGenericName(name, [p.city, shop.city])) {
      skip("placeholder or empty name", p, shop)
      continue
    }
    if (p.state !== shop.state) {
      review("artist", "shop is in a different state", p, c.r, shop, c.score)
      continue
    }
    if (NOT_ARTIST.test(name)) {
      skip("not an artist (supply, product or event account)", p, shop)
      continue
    }
    const page = shopPageCheck(name, shop.name, [p.city, shop.city])
    if (page === "shop") {
      skip("profile is the shop's own page, not an artist", p, shop)
      shopPages.push({ name, instagram_handle: p.instagram_handle, followers: p.instagram_followers, matched_shop_id: shop.id, matched_shop_name: shop.name, profile_url: p.url })
      continue
    }
    if (page === "unsure") {
      review("artist", "name is the shop's name (shop page or solo artist?)", p, c.r, shop, c.score)
      continue
    }
    if (SKIP_PROFILES.has(p.username)) {
      skip("not an artist (named by hand)", p, shop)
      continue
    }
    if (SUPPLY_SHOP.test(shop.name)) {
      skip("shop is a supply, product or equipment company", p, shop)
      continue
    }
    if (UNREADABLE.test(name)) {
      review("artist", "unreadable name", p, c.r, shop, c.score)
      continue
    }
    const nm = normalizeArtistName(name)
    const clash = (other: string) => {
      const o = normalizeArtistName(other)
      return !!o && !!nm && (o === nm || o.includes(nm) || nm.includes(o))
    }
    const here = (activeAtShop.get(shop.id) ?? []).find((a) => clash(a.display_name))
    if (here) {
      skip("shop already has an artist with this name", p, shop, here.display_name)
      continue
    }
    const planned = (plannedAtShop.get(shop.id) ?? []).find(clash)
    if (planned) {
      skip("same name already being added to this shop", p, shop, planned)
      continue
    }
    const ig = p.instagram_handle
    if (ig && igOwner.has(ig)) {
      skip(igOwner.get(ig)!.active ? "Instagram handle already on an active artist" : "Instagram handle on a hidden artist", p, shop, igOwner.get(ig)!.id)
      continue
    }
    if (ig && plannedIg.has(ig)) {
      skip("Instagram handle already being added", p, shop)
      continue
    }
    if (ig) plannedIg.add(ig)
    plannedAtShop.set(shop.id, [...(plannedAtShop.get(shop.id) ?? []), name])
    const wasEmpty = (activeAtShop.get(shop.id) ?? []).length === 0
    if (wasEmpty) emptyShops.add(shop.id)
    inserts.push({
      tw_url: p.url,
      shop_id: shop.id,
      shop_name: shop.name,
      shop_was_empty: wasEmpty,
      via: c.via,
      record: {
        display_name: name,
        handle: makeHandle(name, ig, shop, takenHandles),
        instagram_handle: ig,
        instagram_followers: p.instagram_followers,
        instagram_checked_at: p.instagram_followers !== null ? checkedAt(p) : null,
        styles: styleRule(p),
        shop_id: shop.id,
        city: shop.city,
        state: shop.state,
        is_active: true,
        is_claimed: false,
        source: "tattooswizard",
      },
    })
  }

  // ---- side-effect checks: chain-duplicate detector, finder near Tampa ----
  const stylesAfter = new Map(artistUpdates.filter((u) => u.patch.styles).map((u) => [u.id, u.patch.styles as string[]]))
  const chainRows = (rows: Row[]) => rows.filter((r) => r.shop_id).map(toArtist)
  const shopMap = new Map(shops.map((s) => [s.id, toShop(s)]))
  const groupsNow = buildGroups(chainRows(artists), shopMap).groups.length
  const simulated: Row[] = [
    ...artists.map((a) => (stylesAfter.has(a.id) ? { ...a, styles: stylesAfter.get(a.id) } : a)),
    ...inserts.map((i, n) => ({ ...i.record, id: `new-${n}`, created_at: "9999" })),
  ]
  const groupsAfter = buildGroups(chainRows(simulated), shopMap).groups
  const finderBefore = await finderTotal(supabase)
  const near = (shopId: string | null) => {
    const s = shopId ? shopById.get(shopId) : undefined
    return !!s && s.is_active && !s.possibly_closed && s.latitude != null && s.longitude != null &&
      milesBetween(FINDER.p_lat, FINDER.p_lng, Number(s.latitude), Number(s.longitude)) <= FINDER.p_radius_mi
  }
  const finderGain =
    inserts.filter((i) => near(i.shop_id) && (i.record.styles as string[]).includes("japanese")).length +
    artistUpdates.filter((u) => near(artistById.get(u.id)!.shop_id) && ((u.patch.styles as string[] | undefined) ?? []).includes("japanese")).length

  return {
    artistUpdates,
    shopUpdates,
    inserts,
    reviews,
    skips,
    notes,
    emptyShops: emptyShops.size,
    shopPages,
    activeBefore: artists.length,
    chain: { groupsNow, groupsAfter: groupsAfter.length, sample: groupsAfter.slice(0, 5).map((g) => g.rows.map((r) => `${r.name} @ ${r.shopId}`).join(" / ")) },
    finder: { before: finderBefore, predictedAfter: finderBefore + finderGain },
  }
}

async function finderTotal(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<number> {
  const { data } = await withRetry("finder_artists_near", async () => {
    const res = await supabase.rpc("finder_artists_near", FINDER)
    if (res.error) throw new Error(res.error.message)
    return res
  })
  const rows = (data ?? []) as { total_count?: number }[]
  return rows.length ? Number(rows[0].total_count ?? rows.length) : 0
}

async function activeCount(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<number> {
  return withRetry("count active artists", async () => {
    const { count, error } = await supabase.from("artists").select("id", { count: "exact", head: true }).eq("is_active", true)
    if (error) throw new Error(error.message)
    return count ?? 0
  })
}

async function chainGroups(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<number> {
  const raw = await withRetry("fetch artists", () => fetchAll(supabase, "artists", ARTIST_COLUMNS, (q) => q.eq("is_active", true)))
  const artists = raw.filter((r) => r.shop_id).map(toArtist)
  const shopIds = Array.from(new Set(artists.map((a) => a.shopId)))
  const shopRows = await withRetry("fetch shops", () => fetchIn(supabase, "shops", SHOP_COLUMNS, "id", shopIds))
  return buildGroups(artists, new Map(shopRows.map((s) => [String(s.id), toShop(s)]))).groups.length
}

type Plan = Awaited<ReturnType<typeof buildPlan>>

/** What must match between the dry run and --apply. */
function fingerprint(plan: Plan) {
  return {
    activeBefore: plan.activeBefore,
    artistUpdates: plan.artistUpdates.map((u) => ({ id: u.id, patch: u.patch, old: u.old })),
    shopUpdates: plan.shopUpdates.map((u) => ({ id: u.id, patch: u.patch, old: u.old })),
    inserts: plan.inserts.map((i) => ({ tw_url: i.tw_url, record: i.record })),
  }
}

// ---- report -----------------------------------------------------------------

function seeded<T>(items: T[], k: number): T[] {
  const out = [...items]
  let s = 7
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2 ** 31
    const j = s % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.slice(0, k)
}
const n = (x: number) => x.toLocaleString("en-US")
const fmtF = (f: unknown) => {
  const v = typeof f === "number" ? f : null
  return v === null ? "—" : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : String(v)
}
const cell = (s: unknown) => String(s ?? "—").replace(/\|/g, "\\|")

function writeOutputs(plan: Plan) {
  writeCsv(
    REVIEW_FILE,
    ["kind", "reason", "tw_name", "tw_url", "tw_city", "followers", "our_shop_name", "our_shop_id", "our_shop_city", "match_key", "score"],
    plan.reviews as unknown as Record<string, unknown>[],
  )
  writeCsv(SHOP_PAGES_FILE, ["name", "instagram_handle", "followers", "matched_shop_id", "matched_shop_name", "profile_url"], plan.shopPages)
  writeCsv(SKIPPED_FILE, ["reason", "tw_name", "tw_url", "our_shop_name", "our_shop_id", "detail"], plan.skips as unknown as Record<string, unknown>[])
}

function report(plan: Plan, applied: { activeAfter: number; chainAfter: number; finderAfter: number; build: string; undoFile: string } | null): string {
  const has = (k: string) => (u: Update) => k in u.patch
  const skipCounts: Record<string, number> = {}
  for (const s of plan.skips) skipCounts[s.reason] = (skipCounts[s.reason] ?? 0) + 1
  const reviewCounts: Record<string, number> = {}
  for (const r of plan.reviews) reviewCounts[`${r.kind}: ${r.reason}`] = (reviewCounts[`${r.kind}: ${r.reason}`] ?? 0) + 1
  const shopReviews = plan.reviews.filter((r) => r.kind === "shop").length
  const artistReviews = plan.reviews.length - shopReviews
  const activeAfter = applied ? applied.activeAfter : plan.activeBefore + plan.inserts.length

  const md: string[] = []
  md.push(`## Step 1 report: ${applied ? "APPLIED" : "DRY RUN"}\n`)
  md.push(
    `**In one sentence:** ${applied ? "This run filled" : "This run would fill"} empty Instagram, follower and style fields on ${n(plan.artistUpdates.length)} artists and ${n(plan.shopUpdates.length)} shops, and ${applied ? "added" : "add"} ${n(plan.inserts.length)} new artists at shops we already have.\n`,
  )
  md.push(`**Numbers**`)
  md.push(`| What | Count |\n|---|---|`)
  md.push(`| Existing artists that got an Instagram handle | ${n(plan.artistUpdates.filter(has("instagram_handle")).length)} |`)
  md.push(`| Existing artists that got a follower count | ${n(plan.artistUpdates.filter(has("instagram_followers")).length)} |`)
  md.push(`| Existing artists that got styles | ${n(plan.artistUpdates.filter(has("styles")).length)} |`)
  md.push(`| Shops that got an Instagram link and follower count | ${n(plan.shopUpdates.filter((u) => "instagram_url" in u.patch && "instagram_followers" in u.patch).length)} (link only: ${n(plan.shopUpdates.filter((u) => "instagram_url" in u.patch && !("instagram_followers" in u.patch)).length)}, count only: ${n(plan.shopUpdates.filter((u) => !("instagram_url" in u.patch) && "instagram_followers" in u.patch).length)}) |`)
  md.push(`| Shops that got a website or phone | ${n(plan.shopUpdates.filter((u) => "website" in u.patch || "phone" in u.patch).length)} (website ${n(plan.shopUpdates.filter(has("website")).length)}, phone ${n(plan.shopUpdates.filter(has("phone")).length)}) |`)
  md.push(`| New artists added | ${n(plan.inserts.length)} (${n(plan.inserts.filter((i) => i.via.startsWith("roster of")).length)} of them through a studio roster) |`)
  md.push(`| Shops that went from 0 artists to 1 or more | ${n(plan.emptyShops)} |`)
  md.push(`| Shop matches held for review | ${n(plan.reviews.length)}: ${n(shopReviews)} shops, ${n(artistReviews)} new artists (${Object.entries(reviewCounts).map(([k, v]) => `${k} ${n(v)}`).join("; ")}) |`)
  const skipLines = Object.entries(skipCounts).sort((a, b) => b[1] - a[1])
  md.push(`| New artists skipped | ${n(plan.skips.length)} total |`)
  for (const [k, v] of skipLines) md.push(`| &nbsp;&nbsp;– ${k} | ${n(v)} |`)
  md.push(`| Active artists before / after | ${n(plan.activeBefore)} / ${n(activeAfter)}${applied ? "" : " (expected)"} |`)

  md.push(`\n**Biggest additions:**\n`)
  md.push(`| Name | Shop | City | Followers | Styles |\n|---|---|---|---:|---|`)
  for (const i of [...plan.inserts].sort((a, b) => Number(b.record.instagram_followers ?? -1) - Number(a.record.instagram_followers ?? -1)).slice(0, 15))
    md.push(`| [${cell(i.record.display_name)}](${i.tw_url}) | ${cell(i.shop_name)} | ${cell(i.record.city)}, ${cell(i.record.state)} | ${fmtF(i.record.instagram_followers)} | ${cell((i.record.styles as string[]).join(", ") || "none")} |`)

  md.push(`\n**Spot-check:**\n`)
  md.push(`10 random new artists:\n`)
  md.push(`| Name | Our shop | City | Matched by | Styles |\n|---|---|---|---|---|`)
  for (const i of seeded(plan.inserts, 10))
    md.push(`| [${cell(i.record.display_name)}](${i.tw_url}) | ${cell(i.shop_name)} | ${cell(i.record.city)}, ${cell(i.record.state)} | ${cell(i.via)} | ${cell((i.record.styles as string[]).join(", ") || "none")} |`)
  md.push(`\n10 random review rows:\n`)
  md.push(`| Kind | TattoosWizard name | Their city | Our shop | Our city | Match key | Score |\n|---|---|---|---|---|---|---:|`)
  for (const r of seeded(plan.reviews, 10))
    md.push(`| ${r.kind} | [${cell(r.tw_name)}](${r.tw_url}) | ${cell(r.tw_city)} | ${cell(r.our_shop_name)} | ${cell(r.our_shop_city)} | ${cell(r.match_key)} | ${cell(r.score || "—")} |`)

  md.push(`\n**Checks:**`)
  md.push(`- Chain-duplicate detector: ${n(plan.chain.groupsNow)} groups now, ${n(plan.chain.groupsAfter)} expected after${applied ? `, ${n(applied.chainAfter)} actual` : ""}.`)
  md.push(`- finder_artists_near(27.98, -82.48, 25, '{japanese}'): ${n(plan.finder.before)} before, ${n(plan.finder.predictedAfter)} expected after${applied ? `, ${n(applied.finderAfter)} actual` : ""}.`)
  if (applied) md.push(`- npm run build: ${applied.build}.`)
  md.push(`\nNotes for "problems or surprises": ${JSON.stringify(plan.notes)}`)
  md.push(`\nFiles: \`${path.relative(process.cwd(), REVIEW_FILE)}\`, \`${path.relative(process.cwd(), SKIPPED_FILE)}\`${applied ? `, undo log \`${path.relative(process.cwd(), applied.undoFile)}\`` : ""}.`)
  return md.join("\n") + "\n"
}

// ---- main -------------------------------------------------------------------

async function main() {
  modeBanner(APPLY)
  const supabase = getSupabaseAdmin()
  const plan = await buildPlan(supabase)
  writeOutputs(plan)

  if (!APPLY) {
    fs.writeFileSync(PLAN_FILE, JSON.stringify(fingerprint(plan), null, 1))
    const md = report(plan, null)
    fs.writeFileSync(REPORT_FILE, md)
    console.log(md)
    console.log(`Dry run — nothing written. Plan: ${PLAN_FILE}\nPass --apply to write (undo-logged).`)
    return
  }

  // Recompute and refuse unless it is exactly the dry run.
  if (!fs.existsSync(PLAN_FILE)) throw new Error(`No dry-run plan at ${PLAN_FILE}. Run without --apply first.`)
  const was = fs.readFileSync(PLAN_FILE, "utf-8")
  const now = JSON.stringify(fingerprint(plan), null, 1)
  if (was !== now) {
    const a = JSON.parse(was)
    const b = JSON.parse(now)
    console.error("STOP: the plan differs from the dry run. Nothing was written.")
    for (const k of Object.keys(b)) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) console.error(`  differs: ${k} (dry run ${Array.isArray(a[k]) ? a[k].length : a[k]}, now ${Array.isArray(b[k]) ? b[k].length : b[k]})`)
    process.exit(1)
  }
  if (plan.chain.groupsAfter !== 0) throw new Error(`STOP: the chain-duplicate detector would find ${plan.chain.groupsAfter} groups after this import.`)

  const undo = new UndoLog(SCRIPT)
  console.log(`Undo log: ${undo.file}`)

  // Enrichments: one update per row (patches differ), 500 per batch, 10 at a time.
  for (const updates of [plan.artistUpdates, plan.shopUpdates]) {
    for (let i = 0; i < updates.length; i += BATCH) {
      const batch = updates.slice(i, i + BATCH)
      undo.append(batch.flatMap((u) => Object.keys(u.patch).map((field) => ({ table: u.table, id: u.id, field, old_value: u.old[field] ?? null, new_value: u.patch[field] }))))
      await runPool(batch, 10, async (u) => {
        await withRetry(`update ${u.table} ${u.id}`, async () => {
          const { error } = await supabase.from(u.table).update(u.patch).eq("id", u.id)
          if (error) throw new Error(error.message)
        })
      })
      console.log(`  ${batch[0]?.table}: ${Math.min(i + BATCH, updates.length)} / ${updates.length} updated`)
    }
  }

  // Inserts, logged as is_active false → true so undo hides them.
  const records = plan.inserts.map((i) => ({ id: randomUUID(), ...i.record }))
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)
    const ids = batch.map((r) => r.id)
    undo.append(batch.map((r) => ({ table: "artists", id: r.id, field: "is_active", old_value: false, new_value: true })))
    await withRetry(`insert artists batch ${i / BATCH + 1}`, async (attempt) => {
      // A failed attempt may have written the batch; never insert it twice.
      if (attempt > 1) {
        const present = await fetchIn(supabase, "artists", "id", "id", ids)
        if (present.length === ids.length) return
        if (present.length > 0) throw new Error(`partial insert (${present.length}/${ids.length})`)
      }
      const { error } = await supabase.from("artists").insert(batch)
      if (error) throw new Error(error.message)
    })
    console.log(`  artists: ${Math.min(i + BATCH, records.length)} / ${records.length} inserted`)
  }

  // Verify.
  const activeAfter = await activeCount(supabase)
  const chainAfter = await chainGroups(supabase)
  const finderAfter = await finderTotal(supabase)
  let build = "passed"
  try {
    execSync("npm run build", { stdio: "pipe" })
  } catch (e) {
    build = `FAILED — ${String((e as { stdout?: Buffer }).stdout ?? "").slice(-500)}`
  }
  const md = report(plan, { activeAfter, chainAfter, finderAfter, build, undoFile: undo.file })
  fs.writeFileSync(REPORT_FILE, md)
  console.log(md)
  const ok = activeAfter === plan.activeBefore + plan.inserts.length && chainAfter === 0
  console.log(ok ? "Verification passed." : "VERIFICATION FAILED — see the checks above.")
  console.log(`Undo: npx tsx scripts/tw/undo-import.ts --input ${path.relative(process.cwd(), undo.file)} [--apply]`)
}

main().catch((e) => {
  console.error("Fatal:", e)
  process.exit(1)
})
