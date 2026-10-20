// scripts/ig/import.ts — Step 5: write Instagram follower counts. Fetches nothing.
//
// Reads data/cache/ig-followers.jsonl (scripts/ig/fetch.ts) and, for every
// active artist with an instagram_handle and active shop with an instagram_url:
//   ok            → instagram_followers = new count, instagram_checked_at = now
//                   (old values go to the undo log)
//   big swing     → old count ≥ 1,000 and new < 20% or > 5× of it: not written,
//                   listed in data/reports/ig-followers-review.csv
//   not_business, errors, not looked up, not a profile → row left alone
//   wrong account → one of WRONG_HANDLES (checked by hand): no count, and the
//                   handle (artists.instagram_handle / shops.instagram_url) is
//                   set to null, listed in data/reports/ig-wrong-handles.csv
//   suspect handle→ a bare common first name or a brand/platform name, or
//                   250K+ followers with no word or 4+ letter chunk shared with
//                   the name: count not written, handle kept, listed in
//                   data/reports/ig-suspect-handles.csv
// Only those columns are touched. Nothing is deleted.
//
// Run: npx tsx scripts/ig/import.ts [--apply]
//   Dry run by default: writes data/reports/ig-followers-dryrun.json (the plan),
//   ig-followers-report.md and ig-followers-review.csv.
//   --apply recomputes and stops if the plan differs from the dry run, then
//   writes in batches of 500, undo-logged to data/undo/ig-followers-import-<timestamp>.jsonl.
//   Undo: npx tsx scripts/ig/undo-import.ts --input <log> [--apply]

import { config } from "dotenv"
config({ path: ".env.local", quiet: true })

import fs from "fs"
import path from "path"
import { createHash } from "crypto"
import { getSupabaseAdmin } from "../lib/supabase-admin"
import { UndoLog } from "../lib/undo-log"
import { modeBanner, writeCsv } from "../lib/cleanup-utils"
import { withRetry } from "../lib/retry"
import { flag } from "../tw/lib/common"
import { readCache, REPORT_DIR, type CacheRow } from "./lib"
import { loadTargets, orderedUsernames, type Kind, type Target } from "./targets"

const APPLY = flag("--apply")
const SCRIPT = "ig-followers-import"
const PLAN_FILE = path.join(REPORT_DIR, "ig-followers-dryrun.json")
const REPORT_FILE = path.join(REPORT_DIR, APPLY ? "ig-followers-report.applied.md" : "ig-followers-report.md")
const REVIEW_FILE = path.join(REPORT_DIR, "ig-followers-review.csv")
const WRONG_FILE = path.join(REPORT_DIR, "ig-wrong-handles.csv")
const SUSPECT_FILE = path.join(REPORT_DIR, "ig-suspect-handles.csv")
const BATCH = 500

// Handles checked by hand: they belong to someone else (Step 5 dry run, Oct 20).
const WRONG_HANDLES = new Set(["sean", "paul", "jorge", "linda", "santi", "jeremy", "adam", "fish", "lazada_id", "patreon", "zazzle"])
const HANDLE_FIELD: Record<Kind, string> = { artists: "instagram_handle", shops: "instagram_url" }

// A handle that is one of these, whole, is someone else's account.
const FIRST_NAMES = new Set(
  ("aaron adam adrian alan albert alex alexander alexis alice alicia allison amanda amber amy ana andrea andrew angel angela anna anthony antonio april " +
    "ashley austin barbara ben benjamin beth betty bill billy bob bobby brad brandon brenda brian brittany bruce bryan carl carlos carol caroline carmen " +
    "catherine chad charles charlie chris christian christina christine christopher cindy claire cody colin craig crystal cynthia dan dana daniel danielle " +
    "danny david dawn dean debbie deborah denise dennis derek diana diane diego donald donna doug douglas dylan eddie edgar edward elena elizabeth emily " +
    "emma eric erica erik erin ethan eva evan frank fred gabriel gary george gerald gina grace greg gregory hannah harold heather helen henry holly ian " +
    "isaac ivan jack jacob jake james jamie jane janet jason javier jay jeff jeffrey jen jenna jennifer jeremy jerry jesse jessica jesus jill jim jimmy " +
    "joan joe joel john johnny jon jonathan jordan jorge jose joseph josh joshua juan judy julia julie justin karen kate katherine kathy katie keith kelly " +
    "ken kevin kim kyle larry laura lauren leah lee leo linda lisa logan lori louis lucas luis luke maria mario mark marie martin mary matt matthew megan " +
    "melissa michael michelle miguel mike molly nancy natalie nathan nicholas nick nicole noah oscar pablo pam pamela patrick paul pedro peter phil " +
    "philip rachel ralph randy ray raymond rebecca richard rick ricky rob robert roberto robin roger ron ronald rose ruben russell ryan sam samantha " +
    "samuel sandra santi santiago sara sarah scott sean sergio shane shannon sharon shawn stephanie stephen steve steven susan tammy tara teresa terry " +
    "thomas tim timothy tina todd tom tommy tony tracy travis tyler valerie vanessa victor victoria vincent walter wayne william zach zachary").split(" "),
)
const BRANDS = new Set(
  ("amazon apple bigcartel booksy calendly cashapp depop ebay etsy facebook fresha gmail godaddy gofundme google groupon instagram lazada linktr " +
    "linktree linkinbio meta onlyfans patreon paypal pinterest poshmark redbubble shopify snapchat spotify square squarespace styleseat teepublic " +
    "threads tiktok twitter vagaro venmo walmart weebly wix wordpress yelp youtube zazzle").split(" "),
)
const letters = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "")

/** True when the handle and the name share a word or a 4+ letter chunk. */
function sharesName(name: string, username: string): boolean {
  const h = letters(username)
  const words = name.toLowerCase().normalize("NFKD").split(/[^a-z0-9]+/).filter((w) => w.length >= 3)
  if (words.some((w) => h.includes(w))) return true
  const n = letters(name)
  for (let i = 0; i + 4 <= n.length; i++) if (h.includes(n.slice(i, i + 4))) return true
  return false
}

function suspectReason(name: string, username: string, next: number): string | null {
  const bare = username.toLowerCase().replace(/[^a-z]/g, "")
  if (FIRST_NAMES.has(bare) && bare === username.toLowerCase()) return "bare first name"
  const first = username.toLowerCase().split(/[._]/)[0].replace(/[^a-z]/g, "")
  if ((BRANDS.has(first) || BRANDS.has(bare)) && !sharesName(name, username)) return "brand or platform name"
  if (next >= 250_000 && !sharesName(name, username)) return "250K+ and no match with the name"
  return null
}

interface Write {
  table: Kind
  id: string
  username: string
  old: number | null
  old_checked_at: string | null
  new: number
}

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("en-US"))
const place = (t: { city: string | null; state: string | null }) => [t.city, t.state].filter(Boolean).join(", ") || "—"
const link = (u: string) => `[@${u}](https://www.instagram.com/${u})`

function isSwing(old: number | null, next: number): boolean {
  return old !== null && old >= 1000 && (next < old * 0.2 || next > old * 5)
}

function planHash(writes: Write[]): string {
  const key = writes.map((w) => `${w.table}|${w.id}|${w.new}`).sort().join("\n")
  return createHash("sha256").update(key).digest("hex")
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function main() {
  modeBanner(APPLY)
  const supabase = getSupabaseAdmin()
  const targets = await loadTargets(supabase)
  const cache = readCache()
  const usernames = orderedUsernames(targets)

  const writes: Write[] = []
  const review: Record<string, unknown>[] = []
  const wrong: (Target & { field: string; seen: number | null })[] = []
  const suspect: Record<string, unknown>[] = []
  const left: Record<string, number> = {}
  const bump = (k: string) => (left[k] = (left[k] ?? 0) + 1)

  for (const t of targets) {
    if (!t.username) {
      bump("not a profile (junk handle, post or reel link)")
      continue
    }
    if (WRONG_HANDLES.has(t.username)) {
      wrong.push({ ...t, field: HANDLE_FIELD[t.table], seen: cache.get(t.username)?.followers_count ?? null })
      continue
    }
    const r: CacheRow | undefined = cache.get(t.username)
    if (!r) {
      bump("not looked up yet")
      continue
    }
    if (r.status !== "ok") {
      bump(r.status)
      continue
    }
    const next = r.followers_count!
    if (isSwing(t.followers, next)) {
      review.push({
        table: t.table, id: t.id, name: t.name, city: t.city, state: t.state, username: t.username,
        old_followers: t.followers, new_followers: next, ratio: (next / t.followers!).toFixed(2),
        old_checked_at: t.checked_at, fetched_at: r.fetched_at, profile: `https://www.instagram.com/${t.username}`,
      })
      continue
    }
    const reason = suspectReason(t.name, t.username, next)
    if (reason) {
      suspect.push({
        table: t.table, id: t.id, name: t.name, city: t.city, state: t.state, username: t.username,
        old_followers: t.followers, new_followers: next, reason, profile: `https://www.instagram.com/${t.username}`,
      })
      continue
    }
    writes.push({ table: t.table, id: t.id, username: t.username, old: t.followers, old_checked_at: t.checked_at, new: next })
  }

  // ---- numbers ---------------------------------------------------------------
  const lookedUp = usernames.filter((u) => cache.has(u))
  const status = (s: string) => lookedUp.filter((u) => cache.get(u)!.status === s).length
  const of = (k: Kind) => writes.filter((w) => w.table === k)
  const added = writes.filter((w) => w.old === null)
  const refreshed = writes.filter((w) => w.old !== null)
  const changed = refreshed.filter((w) => w.old !== w.new)

  // After-import values for the top lists.
  const after = new Map<string, number | null>(targets.map((t) => [`${t.table}|${t.id}`, t.followers]))
  for (const w of writes) after.set(`${w.table}|${w.id}`, w.new)
  const top = (k: Kind) =>
    targets
      .filter((t) => t.table === k && after.get(`${t.table}|${t.id}`) !== null)
      .sort((a, b) => (after.get(`${b.table}|${b.id}`) ?? 0) - (after.get(`${a.table}|${a.id}`) ?? 0))
      .slice(0, 25)
  const byKey = new Map(targets.map((t) => [`${t.table}|${t.id}`, t]))

  const hash = planHash(writes) + (wrong.length ? `+${createHash("sha256").update(wrong.map((w) => `${w.table}|${w.id}|clear`).sort().join("\n")).digest("hex")}` : "")
  if (APPLY) {
    if (!fs.existsSync(PLAN_FILE)) throw new Error("No dry-run plan found. Run without --apply first.")
    const plan = JSON.parse(fs.readFileSync(PLAN_FILE, "utf-8")) as { hash: string; writes: number }
    if (plan.hash !== hash) throw new Error(`Plan changed since the dry run (${plan.writes} writes then, ${writes.length} now). Re-run the dry run and review it.`)
  } else {
    fs.mkdirSync(REPORT_DIR, { recursive: true })
    fs.writeFileSync(
      PLAN_FILE,
      JSON.stringify({ at: new Date().toISOString(), hash, writes: writes.length, review: review.length, suspect: suspect.length, clear: wrong.map((w) => ({ table: w.table, id: w.id, field: w.field, old: w.raw })), plan: writes }, null, 2),
    )
  }
  writeCsv(REVIEW_FILE, ["table", "id", "name", "city", "state", "username", "old_followers", "new_followers", "ratio", "old_checked_at", "fetched_at", "profile"], review)
  writeCsv(
    WRONG_FILE,
    ["table", "id", "name", "city", "state", "field", "old_value", "username", "followers_of_that_account", "profile"],
    wrong.map((w) => ({ table: w.table, id: w.id, name: w.name, city: w.city, state: w.state, field: w.field, old_value: w.raw, username: w.username, followers_of_that_account: w.seen, profile: `https://www.instagram.com/${w.username}` })),
  )
  writeCsv(SUSPECT_FILE, ["table", "id", "name", "city", "state", "username", "old_followers", "new_followers", "reason", "profile"], suspect)

  // ---- apply -------------------------------------------------------------------
  let undoFile: string | null = null
  if (APPLY) {
    const undo = new UndoLog(SCRIPT)
    undoFile = undo.file
    const now = new Date().toISOString()
    // Rows getting the same count are written together.
    const groups = new Map<string, Write[]>()
    for (const w of writes) groups.set(`${w.table}|${w.new}`, [...(groups.get(`${w.table}|${w.new}`) ?? []), w])
    let done = 0
    for (const [key, ws] of groups) {
      const [table, count] = key.split("|")
      for (let i = 0; i < ws.length; i += BATCH) {
        const batch = ws.slice(i, i + BATCH)
        undo.append(
          batch.flatMap((w) => [
            { table, id: w.id, field: "instagram_followers", old_value: w.old, new_value: w.new },
            { table, id: w.id, field: "instagram_checked_at", old_value: w.old_checked_at, new_value: now },
          ]),
        )
        await withRetry(`update ${table} → ${count}`, async () => {
          const { error } = await supabase.from(table).update({ instagram_followers: Number(count), instagram_checked_at: now }).in("id", batch.map((w) => w.id))
          if (error) throw new Error(error.message)
        })
        const before = done
        done += batch.length
        if (Math.floor(done / 1000) > Math.floor(before / 1000)) console.log(`  written ${done}/${writes.length}`)
      }
    }
    // Wrong-account handles: cleared one row at a time, old value logged first.
    for (const w of wrong) {
      undo.append([{ table: w.table, id: w.id, field: w.field, old_value: w.raw, new_value: null }])
      await withRetry(`clear ${w.table} ${w.id}`, async () => {
        const { error } = await supabase.from(w.table).update({ [w.field]: null }).eq("id", w.id)
        if (error) throw new Error(error.message)
      })
    }
    console.log(`Wrote ${writes.length} rows and cleared ${wrong.length} wrong handles. Undo log: ${undoFile}`)
  }

  // ---- report ------------------------------------------------------------------
  const sample = shuffle(changed.length >= 15 ? changed : refreshed.concat(added)).slice(0, 15)
  const L: string[] = []
  L.push(`## Step 5 report: ${APPLY ? "APPLIED" : "DRY RUN"}`, "")
  L.push(
    `**In one sentence:** ${APPLY ? "This run" : "This run would"} set Instagram follower counts on ${fmt(of("artists").length)} artists and ${fmt(of("shops").length)} shops (${fmt(added.length)} new, ${fmt(refreshed.length)} refreshed), with ${fmt(review.length)} big swings held for review.`,
    "",
  )
  L.push("**Numbers**", "| What | Count |", "|---|---|")
  L.push(`| Rows with Instagram (active) | ${fmt(targets.length)} (artists ${fmt(targets.filter((t) => t.table === "artists").length)}, shops ${fmt(targets.filter((t) => t.table === "shops").length)}) |`)
  L.push(`| Unique usernames / looked up | ${fmt(usernames.length)} / ${fmt(lookedUp.length)} |`)
  L.push(`| ok / not_business / invalid / errors | ${fmt(status("ok"))} / ${fmt(status("not_business"))} / ${fmt(status("invalid_username"))} / ${fmt(status("rate_limited") + status("other_error"))} |`)
  L.push(`| Artists updated / shops updated | ${fmt(of("artists").length)} / ${fmt(of("shops").length)} |`)
  L.push(`| New counts where there were none | ${fmt(added.length)} |`)
  L.push(`| Counts refreshed (of which changed) | ${fmt(refreshed.length)} (${fmt(changed.length)}) |`)
  L.push(`| Sent to review (big swing) | ${fmt(review.length)} |`)
  L.push(`| Wrong account: handle ${APPLY ? "cleared" : "to clear"}, no count | ${fmt(wrong.length)} |`)
  L.push(`| Suspect handle: count held, handle kept | ${fmt(suspect.length)} |`)
  for (const [k, n] of Object.entries(left).sort((a, b) => b[1] - a[1])) L.push(`| Left alone: ${k} | ${fmt(n)} |`)
  L.push("")
  for (const k of ["artists", "shops"] as Kind[]) {
    L.push(`**Top 25 ${k} by followers after the import**`, "", "| # | Name | City | Handle | Followers | |", "|---|---|---|---|---|---|")
    top(k).forEach((t, i) => {
      const w = writes.find((x) => x.table === t.table && x.id === t.id)
      const tag = !w ? "unchanged" : w.old === null ? "new" : "refreshed"
      L.push(`| ${i + 1} | ${t.name} | ${place(t)} | ${t.username ? link(t.username) : t.raw} | ${fmt(after.get(`${t.table}|${t.id}`))} | ${tag} |`)
    })
    L.push("")
  }
  L.push("**Spot-check:** 15 random changes, before → after", "", "| Kind | Name | City | Handle | Before | After |", "|---|---|---|---|---|---|")
  for (const w of sample) {
    const t = byKey.get(`${w.table}|${w.id}`)!
    L.push(`| ${w.table.replace(/s$/, "")} | ${t.name} | ${place(t)} | ${link(w.username)} | ${fmt(w.old)} | ${fmt(w.new)} |`)
  }
  L.push("")
  if (review.length) {
    L.push("**Held for review (first 10):**", "", "| Kind | Name | Handle | Old | New |", "|---|---|---|---|---|")
    for (const r of review.slice(0, 10)) L.push(`| ${String(r.table).replace(/s$/, "")} | ${r.name} | ${link(String(r.username))} | ${fmt(r.old_followers as number)} | ${fmt(r.new_followers as number)} |`)
    L.push("")
  }
  if (suspect.length) {
    L.push("**Suspect handles (count held, handle kept):**", "", "| Kind | Name | City | Handle | Old | New | Why |", "|---|---|---|---|---|---|---|")
    for (const r of suspect) L.push(`| ${String(r.table).replace(/s$/, "")} | ${r.name} | ${place(r as { city: string | null; state: string | null })} | ${link(String(r.username))} | ${fmt(r.old_followers as number)} | ${fmt(r.new_followers as number)} | ${r.reason} |`)
    L.push("")
  }
  L.push(`**Undo:** ${undoFile ? `\`npx tsx scripts/ig/undo-import.ts --input ${path.relative(process.cwd(), undoFile)} --apply\`` : "nothing written (dry run)."}`, "")
  L.push(`Files: ${[REVIEW_FILE, WRONG_FILE, SUSPECT_FILE, PLAN_FILE].map((f) => `\`${path.relative(process.cwd(), f)}\``).join(", ")}.`)
  fs.writeFileSync(REPORT_FILE, L.join("\n") + "\n")
  console.log(L.join("\n"))
  console.log(`\nReport: ${REPORT_FILE}`)
}

main().catch((e) => {
  console.error((e as Error).message)
  process.exit(1)
})
