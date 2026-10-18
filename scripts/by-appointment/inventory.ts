// scripts/by-appointment/inventory.ts — Step 6 part 1: what we know about the
// private ("by appointment") TattoosWizard artists. Read-only: reads the Step 1
// cache and the database, writes data/reports/by-appointment-inventory.md.
// No names of private people's streets, emails or phones are printed: those are
// counted only.
//
// Run: npx tsx scripts/by-appointment/inventory.ts

import { config } from "dotenv"
config({ path: ".env.local", quiet: true })

import fs from "fs"
import path from "path"
import { getSupabaseAdmin } from "../lib/supabase-admin"
import { REPORT_DIR } from "./lib"
import { buildPlan, type Planned } from "./plan"

const OUT = path.join(REPORT_DIR, "by-appointment-inventory.md")
const fmt = (n: number) => n.toLocaleString("en-US")
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—")

function tally<T>(xs: T[], key: (x: T) => string): [string, number][] {
  const m = new Map<string, number>()
  for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + 1)
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

async function main() {
  const { planned, snapshot } = await buildPlan(getSupabaseAdmin())
  const all = planned
  const n = all.length
  const has = (f: (x: Planned) => boolean) => all.filter(f).length

  // TattoosWizard's own point: shared by several artists in the city (a city
  // geocode) or unique to this artist (could be an exact spot).
  const byCityCoord = new Map<string, number>()
  for (const x of all) if (x.c.raw.coord_key) byCityCoord.set(`${x.state}|${x.city}|${x.c.raw.coord_key}`, (byCityCoord.get(`${x.state}|${x.city}|${x.c.raw.coord_key}`) ?? 0) + 1)
  const uniquePoint = has((x) => !!x.c.raw.coord_key && byCityCoord.get(`${x.state}|${x.city}|${x.c.raw.coord_key}`) === 1)

  const L: string[] = []
  L.push("## Step 6 inventory: private (by appointment) artists", "")
  L.push(`**How they were identified:** Step 1's matcher (scripts/tw/match.ts) gave ${fmt(n)} TattoosWizard pages the status \`artist_new_private\`: an artist page (not a studio page) that matched none of our artists (by Instagram, or name + city + state), whose own Instagram, phone and website matched none of our shops, and that names no studio on the page or in the bio. Everything below comes from the Step 1 cache (\`data/tw/profiles.jsonl\` and the cached raw pages); nothing was fetched.`, "")

  L.push("**What we have for them**", "", "| Field | Have it | Share | Notes |", "|---|---|---|---|")
  const row = (f: string, k: number, note = "") => L.push(`| ${f} | ${fmt(k)} | ${pct(k, n)} | ${note} |`)
  row("Name", has((x) => !!x.c.p.name), `${fmt(has((x) => !!x.name))} usable after cleaning`)
  row("City", has((x) => !!x.c.p.city))
  row("State", has((x) => !!x.c.p.state))
  row("ZIP", has((x) => x.c.raw.has_zip), "only inside a street address; not used")
  row("Street address or named place", has((x) => x.c.raw.has_street), "never used or stored")
  row("Lat/lng (TattoosWizard's)", has((x) => x.c.raw.has_coords), `${fmt(uniquePoint)} are unique to the artist in their city, so not a city center. Never used`)
  row("City center from our shops", has((x) => !!x.center), "what the map pin would use")
  row("Instagram", has((x) => !!x.c.p.instagram_handle))
  row("TikTok", has((x) => !!x.c.raw.tiktok))
  row("Phone", has((x) => x.c.raw.has_phone), "personal number; not imported")
  row("Email", has((x) => x.c.raw.has_email), "personal email; not imported")
  row("Website", has((x) => !!x.c.p.website))
  row("Booking link", has((x) => x.outcome.kind === "insert" ? !!x.outcome.record.booking_url : false), "website on a booking service (insertable rows)")
  row("Styles (after the Step 1 rule)", has((x) => x.c.p.style_slugs.length > 0))
  row("Profile photo", has((x) => x.c.raw.has_photo), "hosted by TattoosWizard; not imported")
  row("Follower count", has((x) => (x.c.p.instagram_followers ?? 0) > 0))
  L.push("")

  const kinds = tally(all, (x) => x.outcome.kind)
  L.push("**Outcome**", "", "| Outcome | Count |", "|---|---|")
  for (const [k, v] of kinds) L.push(`| ${k} | ${fmt(v)} |`)
  L.push("")
  for (const kind of ["duplicate", "junk", "review"] as const) {
    const xs = all.filter((x) => x.outcome.kind === kind)
    if (!xs.length) continue
    L.push(`**${kind} by reason**`, "", "| Reason | Count | On a shop |", "|---|---|---|")
    for (const [r, v] of tally(xs, (x) => (x.outcome as { reason: string }).reason)) {
      const onShop = kind === "duplicate" ? xs.filter((x) => (x.outcome as { reason: string; on_shop: boolean }).reason === r && (x.outcome as { on_shop: boolean }).on_shop).length : null
      L.push(`| ${r} | ${fmt(v)} | ${onShop === null ? "—" : fmt(onShop)} |`)
    }
    L.push("")
  }

  const us = all.filter((x) => x.c.p.country === "US" && x.state)
  L.push("**By state** (US, all outcomes)", "", "| State | Artists | Insertable |", "|---|---|---|")
  for (const [s, v] of tally(us, (x) => x.state!)) L.push(`| ${s} | ${fmt(v)} | ${fmt(us.filter((x) => x.state === s && x.outcome.kind === "insert").length)} |`)
  L.push("", "**Top 20 cities**", "", "| City | Artists | Insertable | Our shops there |", "|---|---|---|---|")
  for (const [c, v] of tally(us, (x) => `${x.city}, ${x.state}`).slice(0, 20)) {
    const xs = us.filter((x) => `${x.city}, ${x.state}` === c)
    L.push(`| ${c} | ${fmt(v)} | ${fmt(xs.filter((x) => x.outcome.kind === "insert").length)} | ${fmt(xs[0].center?.shops ?? 0)} |`)
  }
  L.push("")
  L.push(`Database now: ${fmt(snapshot.activeArtists)} active artists, of which ${fmt(snapshot.shoplessActiveArtists)} have no shop (also invisible in the finder and on the map today).`)

  fs.mkdirSync(REPORT_DIR, { recursive: true })
  fs.writeFileSync(OUT, L.join("\n") + "\n")
  console.log(L.join("\n"))
  console.log(`\nWrote ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
