// scripts/socials/import.ts — Step 2: shop social links. Fetches nothing.
//
// Never deletes rows. Only fills empty fields; never overwrites real data.
//   A. Shops whose website field is an Instagram or Facebook profile: copy it to
//      an empty instagram_url / facebook_url (website is left as is). Links that
//      aren't profiles (/p/, /reel/, /share, /groups/ …) are ignored.
//   B. data/reports/tw-shop-pages.csv (Step 1's shop pages): the matched shop's
//      empty instagram_url, instagram_followers and instagram_checked_at, only
//      when the profile name and the shop name agree (Step 1's rule). Followers
//      only when the shop's Instagram is that profile.
//   C. data/cache/socials/extracted.jsonl (scripts/socials/extract.ts):
//      - website_status and website_checked_at for every crawled shop (when
//        empty). Nothing is hidden or marked closed because of it.
//      - empty instagram_url, tiktok_url, facebook_url, youtube_url from the
//        site's picks, only for sites reached (ok). Ambiguous picks, sites shared
//        by several shops, and shared domains not named like the shop go to the
//        review CSV.
//      - artists pages: an active artist at the shop with the same normalized
//        name gets an empty instagram_handle filled; other people with an
//        Instagram handle are inserted (source 'shop_website', no styles,
//        is_claimed false, city/state from the shop, Step 1's name cleaning)
//        unless the name is a placeholder, the handle is the shop's own or
//        already on an artist, or the shop already has an artist by that name.
//
// Run: npx tsx scripts/socials/import.ts [--apply]
//   Dry run by default: writes data/reports/shop-socials-dryrun.json (the plan),
//   shop-socials-report.md, shop-socials-review.csv and shop-socials-skipped.csv.
//   --apply recomputes and stops if anything differs from the dry run, then
//   writes in batches of 500, undo-logged to data/undo/shop-socials-import-<timestamp>.jsonl.
//   Undo: npx tsx scripts/socials/undo-import.ts --input <log> [--apply]

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import { randomUUID } from "crypto"
import { getSupabaseAdmin } from "../lib/supabase-admin"
import { UndoLog } from "../lib/undo-log"
import { fetchAll, fetchIn, modeBanner, parseCSV, runPool, writeCsv } from "../lib/cleanup-utils"
import { withRetry } from "../lib/retry"
import { isPlaceholderName, normalizeArtistName } from "../lib/artist-names"
import { ARTIST_COLUMNS, SHOP_COLUMNS, buildGroups, toArtist, toShop, type Row } from "../lib/chain-artists"
import { PROFILES_FILE, flag, readJsonl } from "../tw/lib/common"
import type { Profile } from "../tw/lib/parse"
import { dbHandle, normName } from "../tw/lib/normalize"
import { SUPPLY_SHOP, UNREADABLE, cleanName, isGenericName, makeHandle, namesAgree } from "../tw/lib/names"
import { DICT, EXTRACT_FILE, REPORT_DIR, SCOPE_FILE, domainMatchesName, hostOf, type Scope } from "./lib/common"
import type { Extracted } from "./extract"
import { PLATFORMS, socialHost, socialProfile, type Platform } from "./lib/social"

const APPLY = flag("--apply")
const SCRIPT = "shop-socials-import"
const SHOP_PAGES_FILE = path.join(REPORT_DIR, "tw-shop-pages.csv")
const PLAN_FILE = path.join(REPORT_DIR, "shop-socials-dryrun.json")
const REPORT_FILE = path.join(REPORT_DIR, APPLY ? "shop-socials-report.applied.md" : "shop-socials-report.md")
const REVIEW_FILE = path.join(REPORT_DIR, "shop-socials-review.csv")
const SKIPPED_FILE = path.join(REPORT_DIR, "shop-socials-skipped.csv")
const BATCH = 500
const MAX_PEOPLE_PER_SITE = 40

const FIELD: Record<Platform, "instagram_url" | "tiktok_url" | "facebook_url" | "youtube_url"> = {
  instagram: "instagram_url",
  tiktok: "tiktok_url",
  facebook: "facebook_url",
  youtube: "youtube_url",
}

type DbShop = Row & {
  id: string
  name: string
  slug: string | null
  city: string | null
  state: string | null
  website: string | null
  instagram_url: string | null
  facebook_url: string | null
  tiktok_url: string | null
  youtube_url: string | null
  instagram_followers: number | null
  instagram_checked_at: string | null
  website_status: string | null
  website_checked_at: string | null
  is_active: boolean
  possibly_closed: boolean
}
type DbArtist = Row & { id: string; display_name: string; instagram_handle: string | null; shop_id: string | null }

interface ShopUpdate {
  id: string
  name: string
  city: string
  patch: Record<string, unknown>
  old: Record<string, unknown>
  /** Which part set each field: "A", "B" or "C". */
  part: Record<string, string>
}
interface ArtistUpdate {
  id: string
  name: string
  shop_name: string
  patch: Record<string, unknown>
  old: Record<string, unknown>
  page_url: string
}
interface Insert {
  shop_id: string
  shop_name: string
  page_url: string
  record: Record<string, unknown>
}
interface Review {
  kind: string
  reason: string
  shop_id: string
  shop_name: string
  city: string
  website: string
  platform: string
  picked_url: string
  alternates: string
  score: string
  name: string
  handle: string
  page_url: string
}
interface Skip {
  reason: string
  name: string
  handle: string
  shop_id: string
  shop_name: string
  page_url: string
  detail: string
}

const isEmpty = (v: unknown) => v == null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0)
const igUrl = (h: string) => `https://www.instagram.com/${h}`
const igKey = (url: unknown) => (url ? socialProfile(String(url))?.key ?? dbHandle(url) : null)
const checkedAt = (p: Profile | undefined) => (p?.followers_checked_at ? new Date(`${p.followers_checked_at.slice(0, 10)}T00:00:00Z`).toISOString() : null)

// Names that are places, not people ("Manhattan" heading a location card).
const STATES = new Set([
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut", "delaware", "florida", "georgia",
  "hawaii", "idaho", "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine", "maryland", "massachusetts",
  "michigan", "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada", "new hampshire", "new jersey",
  "new mexico", "new york", "north carolina", "north dakota", "ohio", "oklahoma", "oregon", "pennsylvania", "rhode island",
  "south carolina", "south dakota", "tennessee", "texas", "utah", "vermont", "virginia", "washington", "west virginia",
  "wisconsin", "wyoming", "manhattan", "brooklyn", "queens", "bronx", "staten island", "downtown", "uptown", "midtown",
])

/** The handle shares 5+ characters of the shop's name, generic words removed ("7soulstattoo_jc", "7 Souls Tattoo"). */
function shopLikeHandle(handle: string, shopName: string): boolean {
  const strip = (x: string) => x.replace(/tattoos?|tattooing|studios?|piercing|body|and|the|ink|co/g, "")
  const h = strip(handle.toLowerCase().replace(/[^a-z0-9]/g, ""))
  const n = strip(normName(shopName).replace(/ /g, ""))
  for (let len = Math.min(h.length, n.length); len >= 5; len--) for (let i = 0; i + len <= n.length; i++) if (h.includes(n.slice(i, i + len))) return true
  return false
}

// First names that are also US cities but aren't capitalized entries in the
// system word list.
const FIRST_NAMES = new Set([
  "madison", "dallas", "tyler", "chandler", "aurora", "charlotte", "sierra", "phoenix", "camden", "troy", "warren",
  "marion", "brooklyn", "eugene", "florence", "beverly", "raleigh", "hunter", "jordan", "kendall", "logan", "orlando",
  "lincoln", "jackson", "austin", "sydney", "paris", "devon", "chase", "shelby", "harper", "quinn", "reno", "lane",
  "chelsea", "parker", "ashley", "crystal", "marianna", "justin", "celina", "willow", "amber", "april", "autumn",
  "summer", "holly", "ivy", "jade", "ruby", "destiny", "hope", "faith", "grace", "dakota", "cheyenne", "shannon",
  "kelly", "kimberly", "lynn", "angie", "brandi", "candace", "carmen", "clinton", "cody", "darlington", "dayton",
  "denver", "elizabeth", "everett", "franklin", "garland", "hailey", "jasper", "kent", "kingston", "laurel", "leland",
  "lorain", "lucas", "marshall", "mason", "maxwell", "milton", "morgan", "nelson", "norman", "owen", "riley", "salem",
  "taylor", "trinity", "vernon", "victoria", "wesley", "whitney", "winston", "jefferson", "carson", "bryan", "allen",
])

// ---- plan -------------------------------------------------------------------

async function buildPlan(supabase: ReturnType<typeof getSupabaseAdmin>) {
  if (!fs.existsSync(EXTRACT_FILE) || !fs.existsSync(SCOPE_FILE)) throw new Error("No crawl output. Run scripts/socials/crawl.ts and extract.ts first.")
  const extracted = readJsonl<Extracted>(EXTRACT_FILE)
  const scope = JSON.parse(fs.readFileSync(SCOPE_FILE, "utf-8")) as Scope
  const scopeWebsite = new Map(scope.sites.flatMap((s) => s.shops.map((sh) => [sh.id, sh.website] as const)))

  const shops = await withRetry("fetch active shops", () =>
    fetchAll<DbShop>(
      supabase, "shops",
      `${SHOP_COLUMNS}, slug, website, instagram_url, facebook_url, tiktok_url, youtube_url, instagram_followers, instagram_checked_at, website_status, website_checked_at`,
      (q) => q.eq("is_active", true),
    ),
  )
  const shopById = new Map(shops.map((s) => [s.id, s]))
  const artists = await withRetry("fetch active artists", () =>
    fetchAll<DbArtist>(supabase, "artists", `${ARTIST_COLUMNS}, handle, instagram_handle`, (q) => q.eq("is_active", true)),
  )
  const allArtists = await withRetry("fetch all artist handles", () =>
    fetchAll<{ id: string; handle: string | null; instagram_handle: string | null; is_active: boolean }>(supabase, "artists", "id, handle, instagram_handle, is_active"),
  )
  const cities = new Set(shops.map((s) => normName(s.city)).filter(Boolean))
  const activeAtShop = new Map<string, DbArtist[]>()
  for (const a of artists) if (a.shop_id) activeAtShop.set(a.shop_id, [...(activeAtShop.get(a.shop_id) ?? []), a])
  const takenHandles = new Set(allArtists.map((a) => a.handle).filter((h): h is string => !!h))
  const igOwner = new Map<string, { id: string; active: boolean }>()
  for (const a of allArtists) {
    const h = dbHandle(a.instagram_handle)
    if (h && !(igOwner.get(h)?.active ?? false)) igOwner.set(h, { id: a.id, active: a.is_active })
  }
  // Hosts used by more than one active shop (any path).
  const shopsOnHost = new Map<string, number>()
  for (const s of shops) {
    const h = s.website && !socialHost(s.website) ? hostOf(s.website) : null
    if (h) shopsOnHost.set(h, (shopsOnHost.get(h) ?? 0) + 1)
  }

  const reviews: Review[] = []
  const skips: Skip[] = []
  const notes = { partAIgNotProfile: 0, partAFbNotProfile: 0, partAIgHad: 0, partAFbHad: 0, partBNotActive: 0, partBHad: 0, partCHad: {} as Record<string, number>, websiteChanged: 0, shopNotActive: 0, bigRosters: [] as string[] }

  // Working copy of each shop's fields, so later parts see earlier fills.
  const updates = new Map<string, ShopUpdate>()
  const current = (s: DbShop, field: string) => (updates.get(s.id)?.patch[field] ?? s[field]) as unknown
  const set = (s: DbShop, field: string, value: unknown, part: string) => {
    const u = updates.get(s.id) ?? { id: s.id, name: s.name, city: `${s.city ?? ""}, ${s.state ?? ""}`, patch: {}, old: {}, part: {} }
    u.patch[field] = value
    u.old[field] = s[field] ?? null
    u.part[field] = part
    updates.set(s.id, u)
  }
  const reviewShop = (s: DbShop, reason: string, platform: string, url: string, extra: Partial<Review> = {}) =>
    reviews.push({
      kind: "shop link", reason, shop_id: s.id, shop_name: s.name, city: `${s.city ?? ""}, ${s.state ?? ""}`, website: s.website ?? "",
      platform, picked_url: url, alternates: "", score: "", name: "", handle: "", page_url: "", ...extra,
    })

  // ---- A. website field is an Instagram or Facebook profile ----
  for (const s of shops) {
    if (!s.website) continue
    const host = socialHost(s.website)
    if (host !== "instagram" && host !== "facebook") continue
    const p = socialProfile(s.website)
    if (!p) {
      if (host === "instagram") notes.partAIgNotProfile++
      else notes.partAFbNotProfile++
      continue
    }
    const field = host === "instagram" ? "instagram_url" : "facebook_url"
    if (isEmpty(current(s, field))) set(s, field, p.url, "A")
    else if (host === "instagram") notes.partAIgHad++
    else notes.partAFbHad++
  }

  // ---- B. TattoosWizard shop pages from Step 1 ----
  const profiles = new Map(readJsonl<Profile>(PROFILES_FILE).map((p) => [p.url, p]))
  const pageRows = fs.existsSync(SHOP_PAGES_FILE) ? parseCSV(fs.readFileSync(SHOP_PAGES_FILE, "utf-8")) : []
  const pagesByShop = new Map<string, Record<string, string>[]>()
  for (const r of pageRows) pagesByShop.set(r.matched_shop_id, [...(pagesByShop.get(r.matched_shop_id) ?? []), r])
  for (const [shopId, rows] of pagesByShop) {
    const s = shopById.get(shopId)
    if (!s) {
      notes.partBNotActive += rows.length
      continue
    }
    if (rows.length > 1) {
      for (const r of rows) reviewShop(s, `${rows.length} TattoosWizard shop pages matched this one shop`, "instagram", igUrl(r.instagram_handle), { name: r.name, handle: r.instagram_handle, page_url: r.profile_url })
      continue
    }
    const r = rows[0]
    const handle = (r.instagram_handle ?? "").toLowerCase()
    if (!handle) continue
    if (namesAgree(r.name, s.name, [s.city]) === null) {
      reviewShop(s, "TattoosWizard name and shop name don't agree", "instagram", igUrl(handle), { name: r.name, handle, page_url: r.profile_url })
      continue
    }
    if (isEmpty(current(s, "instagram_url"))) set(s, "instagram_url", igUrl(handle), "B")
    else notes.partBHad++
    const p = profiles.get(r.profile_url)
    const followers = r.followers ? Number(r.followers) : null
    if (followers !== null && Number.isFinite(followers) && igKey(current(s, "instagram_url")) === handle) {
      if (s.instagram_followers == null) set(s, "instagram_followers", followers, "B")
      if (s.instagram_checked_at == null && checkedAt(p)) set(s, "instagram_checked_at", checkedAt(p), "B")
    }
  }

  // ---- C. crawled websites ----
  const statusCounts: Record<string, number> = {}
  const shopStatusCounts: Record<string, number> = {}
  type Person = { e: Extracted; s: DbShop; a: Extracted["artists"][number] }
  const people: Person[] = []
  const handleSites = new Map<string, Set<string>>()
  for (const e of extracted) {
    statusCounts[e.status] = (statusCounts[e.status] ?? 0) + 1
    const siteShops: DbShop[] = []
    for (const id of e.shop_ids) {
      const s = shopById.get(id)
      if (!s) {
        notes.shopNotActive++
        continue
      }
      if ((s.website ?? "").trim() !== (scopeWebsite.get(id) ?? "")) {
        notes.websiteChanged++
        continue
      }
      siteShops.push(s)
      shopStatusCounts[e.status] = (shopStatusCounts[e.status] ?? 0) + 1
      if (s.website_status == null) set(s, "website_status", e.status, "C")
      if (s.website_checked_at == null) set(s, "website_checked_at", e.checked_at, "C")
    }
    if (e.status !== "ok" || !siteShops.length) continue

    // Several shop rows on one URL with agreeing names are one business listed twice.
    const sameBusiness = siteShops.every((s) => namesAgree(s.name, siteShops[0].name, [s.city, siteShops[0].city]) !== null)
    for (const s of siteShops) {
      const host = hostOf(s.website ?? "") ?? ""
      const sharedDomain = (shopsOnHost.get(host) ?? 0) > 1 && !domainMatchesName(host, s.name, s.city)
      for (const platform of PLATFORMS) {
        const pk = e.picks[platform]
        if (!pk) continue
        const field = FIELD[platform]
        if (!isEmpty(current(s, field))) {
          notes.partCHad[platform] = (notes.partCHad[platform] ?? 0) + 1
          continue
        }
        const extra = { alternates: pk.alternates.join(" "), score: String(pk.score) }
        if (siteShops.length > 1 && !sameBusiness) reviewShop(s, "same website as other shops with different names", platform, pk.url, extra)
        else if (sharedDomain) reviewShop(s, "domain is shared with other shops and isn't named like this one", platform, pk.url, extra)
        else if (pk.ambiguous) reviewShop(s, `ambiguous: ${pk.reason ?? "two candidates are close"}`, platform, pk.url, extra)
        else set(s, field, pk.url, "C")
      }
    }
    if (siteShops.length !== 1 || !e.artists.length) continue
    if (e.artists.length > MAX_PEOPLE_PER_SITE) {
      notes.bigRosters.push(`${e.key} (${e.artists.length})`)
      for (const a of e.artists) skips.push({ reason: `site lists more than ${MAX_PEOPLE_PER_SITE} people`, name: a.name, handle: a.handle, shop_id: siteShops[0].id, shop_name: siteShops[0].name, page_url: a.page_url, detail: "" })
      continue
    }
    for (const a of e.artists) {
      people.push({ e, s: siteShops[0], a })
      handleSites.set(a.handle, new Set([...(handleSites.get(a.handle) ?? []), siteShops[0].id]))
    }
  }

  // ---- artists from artists pages ----
  const artistUpdates: ArtistUpdate[] = []
  let inserts: Insert[] = []
  const plannedAtShop = new Map<string, string[]>()
  const plannedIg = new Set<string>()
  const filledArtist = new Set<string>()
  const skip = (reason: string, x: Person, detail = "") =>
    skips.push({ reason, name: x.a.name, handle: x.a.handle, shop_id: x.s.id, shop_name: x.s.name, page_url: x.a.page_url, detail })
  for (const x of people) {
    const { s, a } = x
    const name = cleanName(a.name)
    const nm = normalizeArtistName(name)
    const shopIgs = new Set([igKey(current(s, "instagram_url")), x.e.picks.instagram?.key].filter(Boolean))
    if (shopIgs.has(a.handle)) {
      skip("Instagram handle is the shop's own", x)
      continue
    }
    // "@dragonsbanetattoo_bodypierci" under "Ig": the shop's account, not a person's.
    if (shopLikeHandle(a.handle, s.name) && !a.handle.includes(normName(name).split(" ")[0] || "\u0000")) {
      skip("Instagram handle looks like the shop's account", x)
      continue
    }
    if (a.role) {
      skip(a.role === "piercer" ? "piercer, not a tattoo artist" : "cosmetic artist (brows, lashes, PMU), not a tattoo artist", x)
      continue
    }
    // Place names head location cards ("Fairlawn" over @7soulstattoo_fairlawn):
    // a city name ("Jonesboro") counts as a place unless it is also a common
    // first name ("Brandon @thehaletattoo" stays) — and even then when the
    // handle looks like the shop's account or the shop is named after it.
    const place = normName(name)
    const firstName = !place.includes(" ") && (DICT.has(name) || FIRST_NAMES.has(place))
    const isPlace = STATES.has(place) || (cities.has(place) && (!firstName || shopLikeHandle(a.handle, s.name) || normName(s.name).includes(place)))
    if (!name || isPlaceholderName(name) || isGenericName(name, [s.city]) || isPlace) {
      skip("placeholder or place name", x)
      continue
    }
    // Existing artist with the same normalized name: fill an empty handle.
    const here = activeAtShop.get(s.id) ?? []
    const same = here.filter((h) => normalizeArtistName(h.display_name) === nm)
    if (same.length) {
      const target = same[0]
      if (same.length > 1) skip("shop has two artists with this name", x)
      else if (!isEmpty(dbHandle(target.instagram_handle))) skip("artist already listed with an Instagram handle", x, target.display_name)
      else if (igOwner.get(a.handle)?.active || filledArtist.has(target.id) || plannedIg.has(a.handle)) skip("Instagram handle already on another artist", x, igOwner.get(a.handle)?.id ?? "")
      else {
        filledArtist.add(target.id)
        plannedIg.add(a.handle)
        artistUpdates.push({ id: target.id, name: target.display_name, shop_name: s.name, page_url: a.page_url, patch: { instagram_handle: a.handle }, old: { instagram_handle: target.instagram_handle ?? null } })
      }
      continue
    }
    if ((handleSites.get(a.handle)?.size ?? 0) > 1) {
      skip("listed on more than one shop's site", x)
      continue
    }
    if (!s.is_active || s.possibly_closed) {
      skip("shop marked possibly closed", x)
      continue
    }
    if (SUPPLY_SHOP.test(s.name)) {
      skip("shop is a supply, product or equipment company", x)
      continue
    }
    if (UNREADABLE.test(name)) {
      reviews.push({ kind: "artist", reason: "unreadable name", shop_id: s.id, shop_name: s.name, city: `${s.city ?? ""}, ${s.state ?? ""}`, website: s.website ?? "", platform: "instagram", picked_url: igUrl(a.handle), alternates: "", score: "", name, handle: a.handle, page_url: a.page_url })
      continue
    }
    const clash = (other: string) => {
      const o = normalizeArtistName(other)
      return !!o && !!nm && (o === nm || o.includes(nm) || nm.includes(o))
    }
    const near = here.find((h) => clash(h.display_name))
    if (near) {
      skip("shop already has an artist with a similar name", x, near.display_name)
      continue
    }
    const planned = (plannedAtShop.get(s.id) ?? []).find(clash)
    if (planned) {
      skip("same name already being added to this shop", x, planned)
      continue
    }
    if (igOwner.has(a.handle)) {
      skip(igOwner.get(a.handle)!.active ? "Instagram handle already on an active artist" : "Instagram handle on a hidden artist", x, igOwner.get(a.handle)!.id)
      continue
    }
    if (plannedIg.has(a.handle)) {
      skip("Instagram handle already being added", x)
      continue
    }
    plannedIg.add(a.handle)
    plannedAtShop.set(s.id, [...(plannedAtShop.get(s.id) ?? []), name])
    inserts.push({
      shop_id: s.id,
      shop_name: s.name,
      page_url: a.page_url,
      record: {
        display_name: name,
        handle: makeHandle(name, a.handle, s, takenHandles),
        instagram_handle: a.handle,
        styles: [],
        shop_id: s.id,
        city: s.city,
        state: s.state,
        is_active: true,
        is_claimed: false,
        source: "shop_website",
      },
    })
  }

  // ---- chain-duplicate detector: drop inserts that would form a group ----
  const shopMap = new Map(shops.map((s) => [s.id, toShop(s)]))
  const chainRows = (rows: Row[]) => rows.filter((r) => r.shop_id).map(toArtist)
  const groupsNow = buildGroups(chainRows(artists), shopMap).groups.length
  for (let round = 0; round < 5; round++) {
    const simulated: Row[] = [...artists, ...inserts.map((i, n) => ({ ...i.record, id: `new-${n}`, created_at: "9999" }))]
    const groups = buildGroups(chainRows(simulated), shopMap).groups
    const bad = new Set(groups.flatMap((g) => g.rows.filter((r) => r.id.startsWith("new-")).map((r) => Number(r.id.slice(4)))))
    if (!bad.size) break
    for (const n of bad) {
      const i = inserts[n]
      skips.push({ reason: "would duplicate an artist at a related shop (chain-duplicate detector)", name: String(i.record.display_name), handle: String(i.record.instagram_handle), shop_id: i.shop_id, shop_name: i.shop_name, page_url: i.page_url, detail: "" })
    }
    inserts = inserts.filter((_, n) => !bad.has(n))
  }
  const groupsAfter = buildGroups(chainRows([...artists, ...inserts.map((i, n) => ({ ...i.record, id: `new-${n}`, created_at: "9999" }))]), shopMap).groups.length

  const igBefore = shops.filter((s) => !isEmpty(s.instagram_url)).length
  const igAfter = shops.filter((s) => !isEmpty(current(s, "instagram_url"))).length
  const emptyShops = new Set(inserts.filter((i) => !(activeAtShop.get(i.shop_id) ?? []).length).map((i) => i.shop_id)).size

  return {
    shopUpdates: Array.from(updates.values()).sort((a, b) => a.id.localeCompare(b.id)),
    artistUpdates,
    inserts,
    reviews,
    skips,
    notes,
    statusCounts,
    shopStatusCounts,
    sitesCrawled: extracted.length,
    shopsCrawled: Object.values(shopStatusCounts).reduce((a, b) => a + b, 0),
    igBefore,
    igAfter,
    emptyShops,
    activeBefore: artists.length,
    chain: { groupsNow, groupsAfter },
  }
}

async function activeCount(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<number> {
  return withRetry("count active artists", async () => {
    const { count, error } = await supabase.from("artists").select("id", { count: "exact", head: true }).eq("is_active", true)
    if (error) throw new Error(error.message)
    return count ?? 0
  })
}
async function shopsWithInstagram(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<number> {
  return withRetry("count shops with Instagram", async () => {
    const { count, error } = await supabase.from("shops").select("id", { count: "exact", head: true }).eq("is_active", true).not("instagram_url", "is", null).neq("instagram_url", "")
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
    shopUpdates: plan.shopUpdates.map((u) => ({ id: u.id, patch: u.patch, old: u.old })),
    artistUpdates: plan.artistUpdates.map((u) => ({ id: u.id, patch: u.patch, old: u.old })),
    inserts: plan.inserts.map((i) => ({ page_url: i.page_url, record: { ...i.record } })),
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
const cell = (s: unknown) => String(s ?? "—").replace(/\|/g, "\\|")

function writeOutputs(plan: Plan) {
  writeCsv(REVIEW_FILE, ["kind", "reason", "shop_id", "shop_name", "city", "website", "platform", "picked_url", "alternates", "score", "name", "handle", "page_url"], plan.reviews as unknown as Record<string, unknown>[])
  writeCsv(SKIPPED_FILE, ["reason", "name", "handle", "shop_id", "shop_name", "page_url", "detail"], plan.skips as unknown as Record<string, unknown>[])
}

function report(plan: Plan, applied: { activeAfter: number; igAfter: number; chainAfter: number; build: string; undoFile: string } | null): string {
  const filled = (field: string, part: string) => plan.shopUpdates.filter((u) => u.part[field] === part).length
  const skipCounts: Record<string, number> = {}
  for (const s of plan.skips) skipCounts[s.reason] = (skipCounts[s.reason] ?? 0) + 1
  const reviewCounts: Record<string, number> = {}
  for (const r of plan.reviews) reviewCounts[`${r.kind}: ${r.reason}`] = (reviewCounts[`${r.kind}: ${r.reason}`] ?? 0) + 1
  const ambiguous = plan.reviews.filter((r) => r.reason.startsWith("ambiguous")).length
  const activeAfter = applied ? applied.activeAfter : plan.activeBefore + plan.inserts.length
  const sc = plan.statusCounts
  const shc = plan.shopStatusCounts

  const md: string[] = []
  md.push(`## Step 2 report: ${applied ? "APPLIED" : "DRY RUN"}\n`)
  md.push(`**In one sentence:** ${applied ? "This run filled" : "This run would fill"} empty social links on ${n(plan.shopUpdates.filter((u) => Object.keys(u.patch).some((k) => k.endsWith("_url"))).length)} shops, ${applied ? "recorded" : "record"} website health for ${n(plan.shopsCrawled)} crawled shops, and ${applied ? "added" : "add"} ${n(plan.inserts.length)} artists from shop websites.\n`)
  md.push(`**Numbers**`)
  md.push(`| What | Count |\n|---|---|`)
  md.push(`| Part A: shops that got Instagram from their website field | ${n(filled("instagram_url", "A"))} |`)
  md.push(`| Part A: shops that got Facebook from their website field | ${n(filled("facebook_url", "A"))} |`)
  md.push(`| Part B: shops that got Instagram from TattoosWizard shop pages | ${n(filled("instagram_url", "B"))} (follower counts: ${n(filled("instagram_followers", "B"))}) |`)
  md.push(`| Part C: websites crawled / reached (ok) | ${n(plan.sitesCrawled)} / ${n(sc.ok ?? 0)} |`)
  md.push(`| Shops that got Instagram (Part C) | ${n(filled("instagram_url", "C"))} |`)
  md.push(`| Shops that got TikTok | ${n(filled("tiktok_url", "C"))} |`)
  md.push(`| Shops that got Facebook (Part C) | ${n(filled("facebook_url", "C"))} |`)
  md.push(`| Shops that got YouTube | ${n(filled("youtube_url", "C"))} |`)
  md.push(`| Picks held for review (ambiguous) | ${n(ambiguous)} (all review rows: ${n(plan.reviews.length)}) |`)
  for (const [k, v] of Object.entries(reviewCounts).sort((a, b) => b[1] - a[1])) md.push(`| &nbsp;&nbsp;– ${k} | ${n(v)} |`)
  md.push(`| Existing artists that got an Instagram handle | ${n(plan.artistUpdates.length)} |`)
  md.push(`| New artists added from artists pages | ${n(plan.inserts.length)} (${n(plan.emptyShops)} shops go from 0 artists to 1 or more) |`)
  md.push(`| New artists skipped | ${n(plan.skips.length)} total |`)
  for (const [k, v] of Object.entries(skipCounts).sort((a, b) => b[1] - a[1])) md.push(`| &nbsp;&nbsp;– ${k} | ${n(v)} |`)
  md.push(`| Shops with Instagram: before / after | ${n(plan.igBefore)} / ${n(applied ? applied.igAfter : plan.igAfter)}${applied ? "" : " (expected)"} |`)
  md.push(`| Active artists: before / after | ${n(plan.activeBefore)} / ${n(activeAfter)}${applied ? "" : " (expected)"} |`)

  md.push(`\n**Website health** (report only, nothing hidden), sites (shops): ok ${n(sc.ok ?? 0)} (${n(shc.ok ?? 0)}) / redirected ${n(sc.redirected_to_other_domain ?? 0)} (${n(shc.redirected_to_other_domain ?? 0)}) / not found ${n(sc.not_found ?? 0)} (${n(shc.not_found ?? 0)}) / dead ${n(sc.dead ?? 0)} (${n(shc.dead ?? 0)}) / parked ${n(sc.parked ?? 0)} (${n(shc.parked ?? 0)}) / error ${n(sc.error ?? 0)} (${n(shc.error ?? 0)}).`)

  md.push(`\n**Spot-check:**\n`)
  md.push(`10 random shops with the links picked:\n`)
  md.push(`| Shop | City | Instagram | TikTok | Facebook | YouTube |\n|---|---|---|---|---|---|`)
  const linkShops = plan.shopUpdates.filter((u) => ["instagram_url", "tiktok_url", "facebook_url", "youtube_url"].some((f) => u.part[f] === "C"))
  for (const u of seeded(linkShops, 10)) {
    const c = (f: string) => (u.part[f] === "C" ? cell(u.patch[f]) : "—")
    md.push(`| ${cell(u.name)} | ${cell(u.city)} | ${c("instagram_url")} | ${c("tiktok_url")} | ${c("facebook_url")} | ${c("youtube_url")} |`)
  }
  md.push(`\n10 random new artists:\n`)
  md.push(`| Name | Shop | City | Handle |\n|---|---|---|---|`)
  for (const i of seeded(plan.inserts, 10)) md.push(`| ${cell(i.record.display_name)} | ${cell(i.shop_name)} | ${cell(i.record.city)}, ${cell(i.record.state)} | [@${cell(i.record.instagram_handle)}](https://www.instagram.com/${i.record.instagram_handle}) |`)

  md.push(`\n**Checks:**`)
  md.push(`- Chain-duplicate detector: ${n(plan.chain.groupsNow)} groups now, ${n(plan.chain.groupsAfter)} expected after${applied ? `, ${n(applied.chainAfter)} actual` : ""}.`)
  if (applied) md.push(`- npm run build: ${applied.build}.`)
  md.push(`\nNotes: ${JSON.stringify(plan.notes)}`)
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

  const writes: { table: "shops" | "artists"; id: string; patch: Record<string, unknown>; old: Record<string, unknown> }[] = [
    ...plan.shopUpdates.map((u) => ({ table: "shops" as const, id: u.id, patch: u.patch, old: u.old })),
    ...plan.artistUpdates.map((u) => ({ table: "artists" as const, id: u.id, patch: u.patch, old: u.old })),
  ]
  for (let i = 0; i < writes.length; i += BATCH) {
    const batch = writes.slice(i, i + BATCH)
    undo.append(batch.flatMap((u) => Object.keys(u.patch).map((field) => ({ table: u.table, id: u.id, field, old_value: u.old[field] ?? null, new_value: u.patch[field] }))))
    await runPool(batch, 10, async (u) => {
      await withRetry(`update ${u.table} ${u.id}`, async () => {
        const { error } = await supabase.from(u.table).update(u.patch).eq("id", u.id)
        if (error) throw new Error(error.message)
      })
    })
    console.log(`  updates: ${Math.min(i + BATCH, writes.length)} / ${writes.length}`)
  }

  const records = plan.inserts.map((i) => ({ id: randomUUID(), ...i.record }))
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)
    const ids = batch.map((r) => r.id)
    undo.append(batch.map((r) => ({ table: "artists", id: r.id, field: "is_active", old_value: false, new_value: true })))
    await withRetry(`insert artists batch ${i / BATCH + 1}`, async (attempt) => {
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

  const activeAfter = await activeCount(supabase)
  const igAfter = await shopsWithInstagram(supabase)
  const chainAfter = await chainGroups(supabase)
  let build = "passed"
  try {
    execSync("npm run build", { stdio: "pipe" })
  } catch (e) {
    build = `FAILED — ${String((e as { stdout?: Buffer }).stdout ?? "").slice(-500)}`
  }
  const md = report(plan, { activeAfter, igAfter, chainAfter, build, undoFile: undo.file })
  fs.writeFileSync(REPORT_FILE, md)
  console.log(md)
  const ok = activeAfter === plan.activeBefore + plan.inserts.length && chainAfter === 0 && igAfter === plan.igAfter && build === "passed"
  console.log(ok ? "Verification passed." : "VERIFICATION FAILED — see the checks above.")
  console.log(`Undo: npx tsx scripts/socials/undo-import.ts --input ${path.relative(process.cwd(), undo.file)} [--apply]`)
}

main().catch((e) => {
  console.error("Fatal:", e)
  process.exit(1)
})
