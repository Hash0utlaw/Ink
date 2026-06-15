// promote-shop-artists.ts
// Promotes every row in shop_artists into a stub artist profile in artists.
// Run: npx tsx scripts/promote-shop-artists.ts [--dry-run]

import { config } from "dotenv"
config({ path: ".env.local" })

import { createClient } from "@supabase/supabase-js"

// ── CLI flags ────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run")
if (DRY_RUN) console.log("DRY RUN — no data will be written to Supabase.\n")

// ── Supabase (service-role) ──────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local"
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY.trim())

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeHandle(artistName: string, shopSlug: string): string {
  const namePart = artistName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  const shopPart = shopSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
  return `${namePart}--${shopPart}`
}

const PLACEHOLDER_NAMES = new Set([
  "artist",
  "staff",
  "guest",
  "tattoo artist",
  "resident artist",
  "shop artist",
  "tbd",
  "n/a",
  "na",
  "unknown",
  "coming soon",
])

function shouldSkip(name: string | null | undefined): boolean {
  if (!name) return true
  const trimmed = name.trim()
  if (trimmed.length < 2) return true
  if (PLACEHOLDER_NAMES.has(trimmed.toLowerCase())) return true
  return false
}

// Actual shop_artists columns: id, shop_id, name, image_url, specialty, artist_profile_id, created_at
type ShopArtistRow = {
  id: string
  shop_id: string
  name: string | null
  image_url: string | null
  specialty: string | null
  artist_profile_id: string | null
  shops: ShopRecord[] | ShopRecord | null
}

// shops columns used: id, name, slug, city, state, latitude, longitude, address
type ShopRecord = {
  id: string
  name: string
  slug: string
  city: string | null
  state: string | null
}

// ── STEP 1: Inspect schema ───────────────────────────────────────────────────

async function inspectSchema() {
  console.log("=== STEP 1: Schema inspection ===\n")

  const { data: saSample, error: saErr } = await supabase
    .from("shop_artists")
    .select("*")
    .limit(3)

  if (saErr) {
    console.error("Could not read shop_artists:", saErr.message)
  } else {
    console.log("shop_artists sample:")
    if (saSample && saSample.length > 0) {
      console.log("  columns:", Object.keys(saSample[0]).join(", "))
      console.log("  first row:", JSON.stringify(saSample[0], null, 2))
    } else {
      console.log("  (no rows found)")
    }
  }

  const { data: shopSample, error: shopErr } = await supabase
    .from("shops")
    .select("id, name, slug, city, state")
    .limit(1)

  if (shopErr) {
    console.error("Could not read shops:", shopErr.message)
  } else {
    console.log("\nshops sample:")
    if (shopSample && shopSample.length > 0) {
      console.log("  first row:", JSON.stringify(shopSample[0], null, 2))
    } else {
      console.log("  (no rows found)")
    }
  }

  const { data: artistSample, error: artistErr } = await supabase
    .from("artists")
    .select("*")
    .limit(1)

  if (artistErr) {
    console.error("Could not read artists:", artistErr.message)
  } else {
    console.log("\nartists sample:")
    if (artistSample && artistSample.length > 0) {
      console.log("  columns:", Object.keys(artistSample[0]).join(", "))
      console.log("  first row:", JSON.stringify(artistSample[0], null, 2))
    } else {
      console.log("  (table appears empty)")
    }
  }

  console.log("")
}

// ── STEP 2: Fetch shop_artists with parent shop ──────────────────────────────

async function fetchShopArtists(): Promise<ShopArtistRow[]> {
  console.log("=== STEP 2: Fetching shop_artists rows ===\n")

  // Paginate through all rows (Supabase caps at 1000/page by default)
  const PAGE = 1000
  const all: ShopArtistRow[] = []

  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from("shop_artists")
      .select(`
        id,
        shop_id,
        name,
        image_url,
        specialty,
        artist_profile_id,
        shops (
          id,
          name,
          slug,
          city,
          state
        )
      `)
      .not("name", "is", null)
      .not("name", "eq", "")
      .range(page * PAGE, (page + 1) * PAGE - 1)

    if (error) {
      if (page === 0) {
        // First page failed — fall back to manual join
        console.warn("  Relational join failed:", error.message)
        return fetchShopArtistsManual()
      }
      console.warn(`  Page ${page} error (skipping):`, error.message)
      break
    }

    if (!data || data.length === 0) break
    all.push(...(data as unknown as ShopArtistRow[]))
    if (data.length < PAGE) break
  }

  console.log(`  Fetched ${all.length} rows across paginated queries.`)
  return all
}

async function fetchShopArtistsManual(): Promise<ShopArtistRow[]> {
  console.log("  Falling back to manual join...")

  const allArtists: unknown[] = []
  const PAGE = 1000
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from("shop_artists")
      .select("id, shop_id, name, image_url, specialty, artist_profile_id")
      .not("name", "is", null)
      .not("name", "eq", "")
      .range(page * PAGE, (page + 1) * PAGE - 1)
    if (error) throw new Error("Failed to fetch shop_artists: " + error.message)
    if (!data || data.length === 0) break
    allArtists.push(...data)
    if (data.length < PAGE) break
  }

  const allShops: ShopRecord[] = []
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from("shops")
      .select("id, name, slug, city, state")
      .range(page * PAGE, (page + 1) * PAGE - 1)
    if (error) throw new Error("Failed to fetch shops: " + error.message)
    if (!data || data.length === 0) break
    allShops.push(...(data as ShopRecord[]))
    if (data.length < PAGE) break
  }

  const shopMap = new Map<string, ShopRecord>(allShops.map((s) => [s.id, s]))

  return (allArtists as Array<Record<string, unknown>>).map((a) => ({
    ...a,
    shops: shopMap.get(a.shop_id as string) ?? null,
  })) as unknown as ShopArtistRow[]
}

// ── STEP 3: Build artist records ─────────────────────────────────────────────

// Actual artists columns:
//   id, user_id, shop_id, display_name, handle, bio, specialties (array),
//   city, state, hourly_rate, years_experience, instagram_handle, website_url,
//   is_available, is_verified, is_active, rating, review_count,
//   created_at, updated_at, is_claimed, source

function buildArtistRecord(row: ShopArtistRow): Record<string, unknown> | null {
  if (shouldSkip(row.name)) return null

  const shop: ShopRecord | null = Array.isArray(row.shops)
    ? (row.shops[0] ?? null)
    : (row.shops ?? null)
  if (!shop) return null

  const displayName = row.name!.trim()
  const handle = makeHandle(displayName, shop.slug ?? shop.id)

  // Split comma-separated specialty string into individual tags
  const specialties: string[] = row.specialty && row.specialty.trim().length > 0
    ? row.specialty.split(",").map((s: string) => s.trim()).filter(Boolean)
    : []

  return {
    display_name: displayName,
    handle,
    bio: null,
    avatar_url: row.image_url ?? null,
    city: shop.city ?? null,
    state: shop.state ?? null,
    specialties,
    shop_id: row.shop_id,
    is_available: false,
    is_verified: false,
    is_active: true,
    is_claimed: false,
    source: "shop_artists",
    rating: 0,
    review_count: 0,
  }
}

// ── STEP 4: Upsert in batches ────────────────────────────────────────────────

const BATCH_SIZE = 500

async function upsertBatches(records: Record<string, unknown>[]): Promise<void> {
  const total = records.length
  const totalBatches = Math.ceil(total / BATCH_SIZE)

  for (let i = 0; i < totalBatches; i++) {
    const batch = records.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    const batchNum = i + 1

    if (DRY_RUN) {
      console.log(
        `  [DRY RUN] Batch ${batchNum}/${totalBatches} — ${batch.length} artists would be upserted`
      )
      if (i === 0 && batch.length > 0) {
        console.log("  Sample record:", JSON.stringify(batch[0], null, 2))
      }
      continue
    }

    const { error } = await supabase
      .from("artists")
      .upsert(batch, { onConflict: "handle", ignoreDuplicates: true })

    if (error) {
      console.error(`  Batch ${batchNum}/${totalBatches} ERROR:`, error.message)
    } else {
      console.log(`  Batch ${batchNum}/${totalBatches} — ${batch.length} artists queued`)
    }
  }
}

// ── STEP 5: Summarise ────────────────────────────────────────────────────────

function summarise(
  rawCount: number,
  skippedCount: number,
  records: Record<string, unknown>[]
) {
  const byState: Record<string, number> = {}
  for (const r of records) {
    const state = (r.state as string) ?? "UNKNOWN"
    byState[state] = (byState[state] ?? 0) + 1
  }

  const stateLines = Object.entries(byState)
    .sort((a, b) => b[1] - a[1])
    .map(([state, count]) => `    ${state.padEnd(4)} ${count}`)
    .join("\n")

  console.log("\n=== Summary ===")
  console.log(`  Total shop_artists rows read : ${rawCount}`)
  console.log(`  Skipped (bad/missing names)  : ${skippedCount}`)
  console.log(`  Artists queued for upsert    : ${records.length}`)
  if (!DRY_RUN) {
    console.log("  (existing handles silently ignored — ignoreDuplicates: true)")
  }
  if (stateLines) {
    console.log("\n  By state:")
    console.log(stateLines)
  }
  console.log(
    `\n${DRY_RUN ? "[DRY RUN]" : "✓"} Done. ${records.length} artists ${DRY_RUN ? "would be" : "were"} promoted from shop_artists.`
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await inspectSchema()

  const rows = await fetchShopArtists()
  const rawCount = rows.length
  console.log(`\n  Total rows fetched: ${rawCount}\n`)

  const records: Record<string, unknown>[] = []
  let skippedCount = 0

  for (const row of rows) {
    const record = buildArtistRecord(row)
    if (!record) {
      skippedCount++
    } else {
      records.push(record)
    }
  }

  console.log(
    `=== STEP 3: Built ${records.length} artist records (${skippedCount} skipped) ===\n`
  )

  if (records.length === 0) {
    console.log("Nothing to insert. Exiting.")
    process.exit(0)
  }

  console.log("=== STEP 4: Upserting in batches ===\n")
  await upsertBatches(records)

  summarise(rawCount, skippedCount, records)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
