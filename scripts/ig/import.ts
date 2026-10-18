// scripts/ig/import.ts — Step 5: write Instagram follower counts. Fetches nothing.
//
// Reads data/cache/ig-followers.jsonl (scripts/ig/fetch.ts) and, for every
// active artist with an instagram_handle and active shop with an instagram_url:
//   ok            → instagram_followers = new count, instagram_checked_at = now
//                   (old values go to the undo log)
//   big swing     → old count ≥ 1,000 and new < 20% or > 5× of it: not written,
//                   listed in data/reports/ig-followers-review.csv
//   not_business, errors, not looked up, not a profile → row left alone
// Only those two columns are touched. Nothing is deleted.
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
const BATCH = 500

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
  const left: Record<string, number> = {}
  const bump = (k: string) => (left[k] = (left[k] ?? 0) + 1)

  for (const t of targets) {
    if (!t.username) {
      bump("not a profile (junk handle, post or reel link)")
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

  const hash = planHash(writes)
  if (APPLY) {
    if (!fs.existsSync(PLAN_FILE)) throw new Error("No dry-run plan found. Run without --apply first.")
    const plan = JSON.parse(fs.readFileSync(PLAN_FILE, "utf-8")) as { hash: string; writes: number }
    if (plan.hash !== hash) throw new Error(`Plan changed since the dry run (${plan.writes} writes then, ${writes.length} now). Re-run the dry run and review it.`)
  } else {
    fs.mkdirSync(REPORT_DIR, { recursive: true })
    fs.writeFileSync(PLAN_FILE, JSON.stringify({ at: new Date().toISOString(), hash, writes: writes.length, review: review.length, plan: writes }, null, 2))
  }
  writeCsv(REVIEW_FILE, ["table", "id", "name", "city", "state", "username", "old_followers", "new_followers", "ratio", "old_checked_at", "fetched_at", "profile"], review)

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
    console.log(`Wrote ${writes.length} rows. Undo log: ${undoFile}`)
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
  L.push(`**Undo:** ${undoFile ? `\`npx tsx scripts/ig/undo-import.ts --input ${path.relative(process.cwd(), undoFile)} --apply\`` : "nothing written (dry run)."}`, "")
  L.push(`Files: \`${path.relative(process.cwd(), REVIEW_FILE)}\`, \`${path.relative(process.cwd(), PLAN_FILE)}\`.`)
  fs.writeFileSync(REPORT_FILE, L.join("\n") + "\n")
  console.log(L.join("\n"))
  console.log(`\nReport: ${REPORT_FILE}`)
}

main().catch((e) => {
  console.error((e as Error).message)
  process.exit(1)
})
