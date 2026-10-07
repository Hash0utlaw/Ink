// promote-shop-artists.ts
// Promotes shop_artists rows into stub artist profiles in artists.
// Run: npx tsx scripts/promote-shop-artists.ts [--apply]
//   Dry-run by default; --apply inserts, undo-logged as is_active false → true
//   (so scripts/undo.ts deactivates the new artists rather than deleting).
//   Every database call is retried (lib/retry.ts).
//
// Only rows whose shop is active and not possibly_closed are promoted. A row
// is skipped if its name is a placeholder, if an artist with the same shop_id
// and normalized display_name already exists, or if its handle is taken.
//
// New artists get artists.styles from their specialties using the same mapping
// as normalize-styles.ts: data/style-map.json decisions + lib/styles.ts rules.
// Values with no decision are skipped (no AI call here). Shop styles aren't
// touched — re-run normalize-styles.ts to refresh shop_styles.

import { config } from "dotenv"
config({ path: ".env.local" })

import { randomUUID } from "crypto"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog } from "./lib/undo-log"
import { fetchAll, fetchIn, modeBanner } from "./lib/cleanup-utils"
import { isPlaceholderName, normalizeArtistName } from "./lib/artist-names"
import { withRetry } from "./lib/retry"
import { loadStyleMap, stylesFor, type StyleMap } from "./lib/style-map"

const ARGS = parseScriptArgs()
const BATCH_SIZE = 500

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

// Actual shop_artists columns: id, shop_id, name, image_url, specialty, artist_profile_id, created_at
type ShopArtistRow = {
  id: string
  shop_id: string
  name: string | null
  image_url: string | null
  specialty: string | null
}

type ShopRecord = {
  id: string
  slug: string | null
  city: string | null
  state: string | null
}

// Actual artists columns used:
//   id, shop_id, display_name, handle, bio, specialties (array), styles (array), city, state,
//   avatar_url, is_available, is_verified, is_active, is_claimed, source,
//   rating, review_count
function buildArtistRecord(row: ShopArtistRow, shop: ShopRecord, styleMap: StyleMap): Record<string, unknown> {
  const displayName = row.name!.trim()
  // Split comma-separated specialty string into individual tags
  const specialties: string[] = row.specialty?.trim()
    ? row.specialty.split(",").map((s) => s.trim()).filter(Boolean)
    : []
  return {
    id: randomUUID(),
    display_name: displayName,
    handle: makeHandle(displayName, shop.slug ?? shop.id),
    bio: null,
    avatar_url: row.image_url ?? null,
    city: shop.city ?? null,
    state: shop.state ?? null,
    specialties,
    styles: stylesFor(specialties, styleMap),
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

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  modeBanner(ARGS.apply)
  const supabase = getSupabaseAdmin()
  const styleMap = loadStyleMap()

  const rows = await withRetry("fetch shop_artists", () =>
    fetchAll<ShopArtistRow>(supabase, "shop_artists", "id, shop_id, name, image_url, specialty", (q) =>
      q.not("name", "is", null).neq("name", "")
    )
  )
  const shopIds = Array.from(new Set(rows.map((r) => r.shop_id)))
  const shops = await withRetry("fetch shops", () =>
    fetchIn<ShopRecord & { is_active: boolean; possibly_closed: boolean }>(
      supabase,
      "shops",
      "id, slug, city, state, is_active, possibly_closed",
      "id",
      shopIds
    )
  )
  const eligible = new Map<string, ShopRecord>(shops.filter((s) => s.is_active && !s.possibly_closed).map((s) => [s.id, s]))

  // Existing artists at these shops, by shop_id + normalized display_name, and all handles.
  const existing = await withRetry("fetch artists", () =>
    fetchIn<{ shop_id: string; display_name: string | null }>(supabase, "artists", "id, shop_id, display_name", "shop_id", shopIds)
  )
  const existingKeys = new Set(existing.map((a) => `${a.shop_id}|${normalizeArtistName(a.display_name)}`))
  const handles = new Set(
    (await withRetry("fetch handles", () => fetchAll<{ handle: string }>(supabase, "artists", "id, handle"))).map((a) => a.handle)
  )

  const skips = { placeholder: 0, shopNotEligible: 0, alreadyArtist: 0, handleTaken: 0 }
  const records: Record<string, unknown>[] = []
  for (const row of rows) {
    if (isPlaceholderName(row.name)) { skips.placeholder++; continue }
    const shop = eligible.get(row.shop_id)
    if (!shop) { skips.shopNotEligible++; continue }
    const key = `${row.shop_id}|${normalizeArtistName(row.name)}`
    if (existingKeys.has(key)) { skips.alreadyArtist++; continue }
    const record = buildArtistRecord(row, shop, styleMap)
    if (handles.has(String(record.handle))) { skips.handleTaken++; continue }
    existingKeys.add(key)
    handles.add(String(record.handle))
    records.push(record)
  }

  console.log(`shop_artists rows read:              ${rows.length} (${shops.length} shops)`)
  console.log(`  skipped, placeholder name:         ${skips.placeholder}`)
  console.log(`  skipped, shop inactive/closed:     ${skips.shopNotEligible}`)
  console.log(`  skipped, artist already exists:    ${skips.alreadyArtist}`)
  console.log(`  skipped, handle taken:             ${skips.handleTaken}`)
  console.log(`  to promote:                        ${records.length}`)
  console.log(`  of which get ≥1 style:             ${records.filter((r) => (r.styles as string[]).length > 0).length}`)

  const byState: Record<string, number> = {}
  for (const r of records) byState[String(r.state ?? "UNKNOWN")] = (byState[String(r.state ?? "UNKNOWN")] ?? 0) + 1
  const stateLines = Object.entries(byState).sort((a, b) => b[1] - a[1]).slice(0, 15)
  if (stateLines.length) console.log(`\nBy state (top 15):\n${stateLines.map(([s, n]) => `  ${s.padEnd(8)} ${n}`).join("\n")}`)
  if (records.length) console.log(`\nSample record: ${JSON.stringify(records[0])}`)

  if (!ARGS.apply) {
    console.log("\nDry run — nothing written. Pass --apply to write (undo-logged).")
    return
  }

  const undo = new UndoLog("promote-shop-artists")
  let inserted = 0
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    undo.append(batch.map((r) => ({ table: "artists", id: String(r.id), field: "is_active", old_value: false, new_value: true })))
    const ids = batch.map((r) => String(r.id))
    await withRetry(`insert artists batch ${i / BATCH_SIZE + 1}`, async (attempt) => {
      // A failed attempt may have written the batch; never insert it twice.
      if (attempt > 1) {
        const present = await fetchIn(supabase, "artists", "id", "id", ids)
        if (present.length === ids.length) return
        if (present.length > 0) throw new Error(`partial insert (${present.length}/${ids.length})`)
      }
      const { error } = await supabase.from("artists").insert(batch)
      if (error) throw new Error(error.message)
    })
    inserted += batch.length
  }
  console.log(`\nInserted ${inserted} artists. Undo log: ${undo.file} (${undo.entries} entries)`)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
