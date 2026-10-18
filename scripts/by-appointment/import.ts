// scripts/by-appointment/import.ts — Step 6: list private (by appointment)
// TattoosWizard artists. Fetches nothing; reads the Step 1 cache and the database.
//
// Inserts one artists row per private artist (scripts/by-appointment/plan.ts
// decides who): shop_id null, works_by_appointment true, city + state, and
// area_latitude / area_longitude = the city center from our own active shops
// (2 decimals). Never a street address, ZIP, TattoosWizard's own point, email
// or phone. Photos are not copied (they're hosted by TattoosWizard).
// Also: display name (Step 1's cleaning), handle "<name>--<city>-<st>",
// Instagram handle and follower count, TikTok, styles (Step 1's rule),
// website_url / booking_url, is_claimed false, source 'tattooswizard'.
//
// Skipped: already listed (same Instagram as an active artist or shop, a hidden
// artist, or same name + city) — those stay where they are; junk; and anything
// held for review (named like a shop, possible product brand, name needs
// cleanup, city with no shops of ours to take a center from).
//
// Needs supabase/migrations/20261018120000_by_appointment_artists.sql applied.
//
// Run: npx tsx scripts/by-appointment/import.ts [--apply]
//   Dry run by default (works before the migration): writes
//   data/reports/by-appointment-dryrun.json (the plan), by-appointment-report.md
//   and by-appointment-skipped.csv. Nothing is written to the database.
//   --apply stops unless the migration is applied and the plan matches the dry
//   run, then inserts in batches of 500, undo-logged first to
//   data/undo/by-appointment-import-<timestamp>.jsonl (each insert as is_active false → true).
//   Undo: npx tsx scripts/by-appointment/undo-import.ts --input <log> [--apply]

import { config } from "dotenv"
config({ path: ".env.local", quiet: true })

import fs from "fs"
import path from "path"
import { createHash, randomUUID } from "crypto"
import { getSupabaseAdmin } from "../lib/supabase-admin"
import { UndoLog } from "../lib/undo-log"
import { modeBanner, writeCsv } from "../lib/cleanup-utils"
import { withRetry } from "../lib/retry"
import { flag } from "../tw/lib/common"
import { styleLabel } from "../../lib/styles"
import { REPORT_DIR } from "./lib"
import { buildPlan, type Planned } from "./plan"

const APPLY = flag("--apply")
const SCRIPT = "by-appointment-import"
const PLAN_FILE = path.join(REPORT_DIR, "by-appointment-dryrun.json")
const REPORT_FILE = path.join(REPORT_DIR, APPLY ? "by-appointment-report.applied.md" : "by-appointment-report.md")
const SKIPPED_FILE = path.join(REPORT_DIR, "by-appointment-skipped.csv")
const BATCH = 500
// Columns an insert may set. Anything else in a record is a bug: stop.
const ALLOWED = new Set([
  "id", "display_name", "handle", "instagram_handle", "instagram_followers", "instagram_checked_at", "tiktok_handle", "styles",
  "website_url", "booking_url", "shop_id", "city", "state", "works_by_appointment", "area_latitude", "area_longitude",
  "is_active", "is_claimed", "source",
])

const fmt = (n: number) => n.toLocaleString("en-US")
const followers = (n: unknown) => {
  const v = Number(n ?? 0)
  return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v ? String(v) : "—"
}

function seeded<T>(xs: T[], k: number): T[] {
  // Same 10 every run: spread evenly through the list (sorted by followers).
  if (xs.length <= k) return xs
  const step = xs.length / k
  return Array.from({ length: k }, (_, i) => xs[Math.floor(i * step + step / 2)])
}

function planHash(records: Record<string, unknown>[]): string {
  const key = records.map((r) => JSON.stringify({ ...r, id: undefined })).sort().join("\n")
  return createHash("sha256").update(key).digest("hex")
}

async function main() {
  modeBanner(APPLY)
  const supabase = getSupabaseAdmin()
  const { planned, snapshot } = await buildPlan(supabase)

  const inserts = planned.filter((x): x is Planned & { outcome: { kind: "insert"; record: Record<string, unknown> } } => x.outcome.kind === "insert")
  const skipped = planned.filter((x) => x.outcome.kind !== "insert")
  const records = inserts.map((x) => x.outcome.record)

  // Privacy guard: nothing finer than a city, ever.
  for (const r of records) {
    for (const k of Object.keys(r)) if (!ALLOWED.has(k)) throw new Error(`Refusing: record has unexpected column ${k}`)
    for (const k of ["area_latitude", "area_longitude"]) {
      const v = Number(r[k])
      if (!Number.isFinite(v) || Math.round(v * 100) / 100 !== v) throw new Error(`Refusing: ${k}=${r[k]} is not a 2-decimal city point`)
    }
    if (r.shop_id !== null || r.works_by_appointment !== true) throw new Error("Refusing: private rows must have no shop and works_by_appointment true")
  }

  const hash = planHash(records)
  if (APPLY) {
    const probe = await supabase.from("artists").select("id, works_by_appointment, area_latitude, area_longitude").limit(1)
    if (probe.error) throw new Error(`The by-appointment migration isn't applied (${probe.error.message}). Apply supabase/migrations/20261018120000_by_appointment_artists.sql first.`)
    if (!fs.existsSync(PLAN_FILE)) throw new Error("No dry-run plan found. Run without --apply first.")
    const plan = JSON.parse(fs.readFileSync(PLAN_FILE, "utf-8")) as { hash: string; inserts: number }
    if (plan.hash !== hash) throw new Error(`Plan changed since the dry run (${plan.inserts} inserts then, ${records.length} now). Re-run the dry run and review it.`)
  } else {
    fs.mkdirSync(REPORT_DIR, { recursive: true })
    fs.writeFileSync(PLAN_FILE, JSON.stringify({ at: new Date().toISOString(), hash, inserts: records.length, records: inserts.map((x) => ({ tw_url: x.c.p.url, ...x.outcome.record })) }, null, 2))
  }
  writeCsv(
    SKIPPED_FILE,
    ["outcome", "reason", "name", "tw_name", "city", "state", "instagram", "followers", "existing_artist_id", "existing_on_shop", "tw_url"],
    skipped.map((x) => {
      const o = x.outcome as { kind: string; reason: string; artist_id?: string; on_shop?: boolean }
      return {
        outcome: o.kind, reason: o.reason, name: x.name, tw_name: x.c.p.name, city: x.city, state: x.state,
        instagram: x.c.p.instagram_handle, followers: x.c.p.instagram_followers, existing_artist_id: o.artist_id ?? "",
        existing_on_shop: o.kind === "duplicate" ? (o.on_shop ? "yes" : "no") : "", tw_url: x.c.p.url,
      }
    }),
  )

  let undoFile: string | null = null
  if (APPLY) {
    const undo = new UndoLog(SCRIPT)
    undoFile = undo.file
    const rows = records.map((r) => ({ id: randomUUID(), ...r }))
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      undo.append(batch.map((r) => ({ table: "artists", id: r.id, field: "is_active", old_value: false, new_value: true })))
      await withRetry(`insert batch ${i / BATCH + 1}`, async () => {
        const { error } = await supabase.from("artists").upsert(batch, { onConflict: "id", ignoreDuplicates: true })
        if (error) throw new Error(error.message)
      })
      console.log(`  inserted ${Math.min(i + BATCH, rows.length)}/${rows.length}`)
    }
  }

  // ---- report ------------------------------------------------------------------
  const count = (kind: string, reason?: string) => planned.filter((x) => x.outcome.kind === kind && (!reason || (x.outcome as { reason?: string }).reason === reason)).length
  const reasons = (kind: string) => {
    const m = new Map<string, number>()
    for (const x of planned) if (x.outcome.kind === kind) m.set((x.outcome as { reason: string }).reason, (m.get((x.outcome as { reason: string }).reason) ?? 0) + 1)
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }
  const cities = new Set(records.map((r) => `${r.city}|${r.state}`))
  const L: string[] = []
  L.push(`## Step 6 import plan: ${APPLY ? "APPLIED" : "DRY RUN (nothing written)"}`, "")
  L.push(`**In one sentence:** ${APPLY ? "Added" : "Would add"} ${fmt(records.length)} by-appointment artists in ${fmt(cities.size)} cities, each placed at their city's center with no address, and skipped ${fmt(skipped.length)} (already listed, junk, or held for review).`, "")
  L.push("| What | Count |", "|---|---|")
  L.push(`| Private TattoosWizard artists | ${fmt(planned.length)} |`)
  L.push(`| Would insert | ${fmt(records.length)} |`)
  L.push(`| Already listed (left where they are) | ${fmt(count("duplicate"))} |`)
  for (const [r, n] of reasons("duplicate")) L.push(`| &nbsp;&nbsp;– ${r} | ${fmt(n)} |`)
  L.push(`| Junk | ${fmt(count("junk"))} |`)
  for (const [r, n] of reasons("junk")) L.push(`| &nbsp;&nbsp;– ${r} | ${fmt(n)} |`)
  L.push(`| Held for review | ${fmt(count("review"))} |`)
  for (const [r, n] of reasons("review")) L.push(`| &nbsp;&nbsp;– ${r} | ${fmt(n)} |`)
  L.push(`| Inserts with styles / Instagram / followers | ${fmt(records.filter((r) => (r.styles as string[]).length).length)} / ${fmt(records.filter((r) => r.instagram_handle).length)} / ${fmt(records.filter((r) => r.instagram_followers).length)} |`)
  L.push(`| Inserts with website / booking link / TikTok | ${fmt(records.filter((r) => r.website_url).length)} / ${fmt(records.filter((r) => r.booking_url).length)} / ${fmt(records.filter((r) => r.tiktok_handle).length)} |`)
  L.push(`| Active artists: now / after | ${fmt(snapshot.activeArtists)} / ${fmt(snapshot.activeArtists + records.length)} |`)
  L.push("")
  L.push("**10 example artists** (spread through the list, most followed first)", "", "| Name | City | Instagram | Followers | Styles | Card line | Pin at |", "|---|---|---|---|---|---|---|")
  for (const x of seeded(inserts, 10)) {
    const r = x.outcome.record
    L.push(
      `| ${r.display_name} | ${r.city}, ${r.state} | ${r.instagram_handle ? `[@${r.instagram_handle}](https://www.instagram.com/${r.instagram_handle})` : "—"} | ${followers(r.instagram_followers)} | ${(r.styles as string[]).map((s) => styleLabel(s)).join(", ") || "—"} | By appointment · ${r.city}, ${r.state} | ${r.city} center (${Number(r.area_latitude).toFixed(2)}, ${Number(r.area_longitude).toFixed(2)}) |`,
    )
  }
  L.push("")
  L.push(`**Undo:** ${undoFile ? `\`npx tsx scripts/by-appointment/undo-import.ts --input ${path.relative(process.cwd(), undoFile)} --apply\`` : "nothing written (dry run)."}`, "")
  L.push(`Files: \`${path.relative(process.cwd(), PLAN_FILE)}\`, \`${path.relative(process.cwd(), SKIPPED_FILE)}\`.`)
  fs.writeFileSync(REPORT_FILE, L.join("\n") + "\n")
  console.log(L.join("\n"))
  console.log(`\nReport: ${REPORT_FILE}`)
}

main().catch((e) => {
  console.error((e as Error).message)
  process.exit(1)
})
