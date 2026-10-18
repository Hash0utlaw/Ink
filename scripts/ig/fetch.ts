// scripts/ig/fetch.ts — Step 5: Instagram follower counts from Meta Business Discovery.
//
// Read-only: reads the database, writes nothing to it. For each unique username
// (active artists' instagram_handle, active shops' instagram_url; rows without a
// follower count first) it calls
//   GET /{IG_BUSINESS_ID}?fields=business_discovery.username(X){username,followers_count,media_count}
// and appends the result to data/cache/ig-followers.jsonl:
//   ok | not_business (personal or not found) | invalid_username | rate_limited | other_error
// Re-runs skip usernames already cached as ok / not_business / invalid_username.
//
// Pacing comes from Meta's X-App-Usage and X-Business-Use-Case-Usage headers
// (logged to data/cache/ig-usage.jsonl): normal pace below 50%, slower up to
// 70%, much slower above 70%, and above 90% it pauses until Meta says access
// is back. If Meta rate-limits or blocks a call, or the token stops working,
// it stops cleanly; every finished lookup is already saved.
//
// Run: npx tsx scripts/ig/fetch.ts [--preflight] [--limit N] [--usernames a,b]
//   --preflight  20 usernames: carlostorresart plus artists and shops, with and
//                without a count, and prints a table and the usage headers.
// Needs META_LONG_TOKEN, IG_BUSINESS_ID, META_GRAPH_VERSION (scripts/ig/token.ts).

import { config } from "dotenv"
config({ path: ".env.local", quiet: true })

import fs from "fs"
import path from "path"
import { getSupabaseAdmin } from "../lib/supabase-admin"
import { numOption, option, flag } from "../tw/lib/common"
import { appendCache, CACHE_FILE, FINAL, graphGet, readCache, REPORT_DIR, requireEnv, USAGE_FILE, type CacheRow, type GraphError } from "./lib"
import { loadTargets, orderedUsernames, type Target } from "./targets"

const PREFLIGHT = flag("--preflight")
const LIMIT = numOption("--limit")
const ONLY = option("--usernames")
const PREFLIGHT_SEED = "carlostorresart"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ---- usage headers ---------------------------------------------------------

interface Usage {
  max: number
  regainMinutes: number
  app: Record<string, number> | null
  buc: Record<string, Record<string, number>[]> | null
}

function parseJson<T>(s: string | null): T | null {
  if (!s) return null
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

function readUsage(h: Headers): Usage {
  const app = parseJson<Record<string, number>>(h.get("x-app-usage"))
  const buc = parseJson<Record<string, Record<string, number>[]>>(h.get("x-business-use-case-usage"))
  const pcts: number[] = []
  let regain = 0
  if (app) for (const k of ["call_count", "total_time", "total_cputime"]) if (typeof app[k] === "number") pcts.push(app[k])
  if (buc)
    for (const list of Object.values(buc))
      for (const u of list ?? []) {
        for (const k of ["call_count", "total_time", "total_cputime"]) if (typeof u[k] === "number") pcts.push(u[k])
        if (typeof u.estimated_time_to_regain_access === "number") regain = Math.max(regain, u.estimated_time_to_regain_access)
      }
  return { max: pcts.length ? Math.max(...pcts) : 0, regainMinutes: regain, app, buc }
}

/** Wait before the next call, from the last usage reading. */
function delayFor(u: Usage): number {
  if (u.max >= 70) return 30_000
  if (u.max >= 50) return 4_000
  return 1_000
}

// ---- one lookup ------------------------------------------------------------

type Outcome = { row: CacheRow; usage: Usage; fatal?: string }

const RATE_CODES = new Set([4, 17, 32, 613])
const isRate = (e: GraphError, status: number) => status === 429 || RATE_CODES.has(e.code ?? -1) || ((e.code ?? 0) >= 80000 && (e.code ?? 0) < 80100)

async function lookup(username: string, version: string, igId: string, token: string): Promise<Outcome> {
  const r = await graphGet<{ business_discovery?: { username: string; followers_count?: number; media_count?: number } }>(`${version}/${igId}`, {
    fields: `business_discovery.username(${username}){username,followers_count,media_count}`,
    access_token: token,
  })
  const usage = readUsage(r.headers)
  const fetched_at = new Date().toISOString()
  if (!("error" in r.body && r.body.error)) {
    const bd = (r.body as { business_discovery?: { username: string; followers_count?: number; media_count?: number } }).business_discovery
    if (bd && typeof bd.followers_count === "number")
      return { usage, row: { username, status: "ok", followers_count: bd.followers_count, media_count: bd.media_count, ig_username: bd.username, fetched_at } }
    return { usage, row: { username, status: "other_error", message: "no followers_count in response", fetched_at } }
  }
  const e = r.body.error
  const base = { username, error_code: e.code, error_subcode: e.error_subcode, message: e.error_user_msg || e.message, fetched_at }
  // 110/2207013 "Cannot find User": personal account, or no such username.
  if (e.error_subcode === 2207013 || (e.code === 110 && /cannot be found|cannot find/i.test(`${e.error_user_msg} ${e.message}`)))
    return { usage, row: { ...base, status: "not_business" } }
  if (isRate(e, r.status)) return { usage, row: { ...base, status: "rate_limited" }, fatal: `Meta rate-limited the app (code ${e.code}): ${e.message}` }
  if (e.code === 368) return { usage, row: { ...base, status: "rate_limited" }, fatal: `Meta temporarily blocked the app (code 368): ${e.message}` }
  if (e.code === 190 || e.code === 102) return { usage, row: { ...base, status: "other_error" }, fatal: `The token stopped working (code ${e.code}): ${e.message}. Run scripts/ig/token.ts with a fresh META_USER_TOKEN.` }
  if (e.code === 10 || e.code === 200 || e.code === 3) return { usage, row: { ...base, status: "other_error" }, fatal: `Permission refused (code ${e.code}): ${e.message}` }
  if (e.code === 100 && /username/i.test(`${e.error_user_msg} ${e.message}`)) return { usage, row: { ...base, status: "invalid_username" } }
  return { usage, row: { ...base, status: "other_error" } }
}

// ---- which usernames -------------------------------------------------------

function preflightSample(targets: Target[]): string[] {
  const pick = new Set<string>([PREFLIGHT_SEED])
  const groups: [Target["table"], boolean, number][] = [
    ["artists", false, 5],
    ["artists", true, 5],
    ["shops", false, 5],
    ["shops", true, 4],
  ]
  for (const [table, hasCount, n] of groups) {
    const pool = targets.filter((t) => t.table === table && t.username && (t.followers !== null) === hasCount && !pick.has(t.username))
    for (let added = 0; added < n && pool.length; ) {
      const t = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
      if (!pick.has(t.username!)) {
        pick.add(t.username!)
        added++
      }
    }
  }
  return Array.from(pick)
}

async function main() {
  const token = requireEnv("META_LONG_TOKEN")
  const igId = requireEnv("IG_BUSINESS_ID")
  const version = requireEnv("META_GRAPH_VERSION")

  const targets = await loadTargets(getSupabaseAdmin())
  const ordered = orderedUsernames(targets)
  const cache = readCache()

  let queue: string[]
  if (ONLY) queue = ONLY.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  else if (PREFLIGHT) queue = preflightSample(targets)
  else queue = ordered.filter((u) => !FINAL.has(cache.get(u)?.status as never))
  if (LIMIT !== null) queue = queue.slice(0, LIMIT)

  const notProfile = targets.filter((t) => !t.username).length
  console.log(`Rows: ${targets.length} (${targets.filter((t) => t.table === "artists").length} artists, ${targets.filter((t) => t.table === "shops").length} shops); not a profile: ${notProfile}`)
  console.log(`Unique usernames: ${ordered.length}; already cached (final): ${ordered.filter((u) => FINAL.has(cache.get(u)?.status as never)).length}`)
  console.log(`This run: ${queue.length} lookups${PREFLIGHT ? " (preflight)" : ""}\n`)

  let stopping = false
  process.on("SIGINT", () => {
    stopping = true
    console.log("\nStopping after the current lookup…")
  })

  fs.mkdirSync(path.dirname(USAGE_FILE), { recursive: true })
  const results: (CacheRow & { usage: Usage })[] = []
  const counts: Record<string, number> = {}
  let consecutiveErrors = 0
  let fatal: string | undefined
  const started = Date.now()

  for (let i = 0; i < queue.length && !stopping; i++) {
    const username = queue[i]
    let out: Outcome
    try {
      out = await lookup(username, version, igId, token)
    } catch (e) {
      out = { usage: { max: 0, regainMinutes: 0, app: null, buc: null }, row: { username, status: "other_error", message: (e as Error).message, fetched_at: new Date().toISOString() } }
    }
    appendCache(out.row)
    fs.appendFileSync(USAGE_FILE, JSON.stringify({ at: out.row.fetched_at, n: i + 1, max: out.usage.max, app: out.usage.app, buc: out.usage.buc }) + "\n")
    results.push({ ...out.row, usage: out.usage })
    counts[out.row.status] = (counts[out.row.status] ?? 0) + 1

    if (out.fatal) {
      fatal = out.fatal
      break
    }
    consecutiveErrors = out.row.status === "other_error" ? consecutiveErrors + 1 : 0
    if (consecutiveErrors >= 10) {
      fatal = `10 errors in a row; last: ${out.row.message}`
      break
    }

    if ((i + 1) % 25 === 0 || PREFLIGHT) {
      const rate = ((i + 1) / ((Date.now() - started) / 3_600_000)).toFixed(0)
      if (!PREFLIGHT) console.log(`  ${i + 1}/${queue.length}  usage ${out.usage.max}%  ${rate}/h  ${JSON.stringify(counts)}`)
    }

    if (out.usage.max >= 90) {
      const mins = Math.max(out.usage.regainMinutes, 15)
      console.log(`  usage ${out.usage.max}%: pausing ${mins} min until Meta resets the window…`)
      await sleep(mins * 60_000)
    } else if (i + 1 < queue.length) {
      await sleep(delayFor(out.usage))
    }
  }

  if (PREFLIGHT || ONLY) {
    const byUser = new Map<string, Target[]>()
    for (const t of targets) if (t.username) byUser.set(t.username, [...(byUser.get(t.username) ?? []), t])
    console.log("| # | Username | Rows | Old count | Status | Followers | Posts | Usage after call |")
    console.log("|---|---|---|---|---|---|---|---|")
    results.forEach((r, i) => {
      const rows = byUser.get(r.username) ?? []
      const kinds = rows.length ? Array.from(new Set(rows.map((t) => t.table.replace(/s$/, "")))).join("+") : "not in DB"
      const old = rows.map((t) => t.followers).filter((f) => f !== null)
      console.log(
        `| ${i + 1} | @${r.username} | ${kinds} | ${old.length ? old.map((n) => n!.toLocaleString()).join(" / ") : "—"} | ${r.status}${r.status !== "ok" && r.message ? ` (${r.message.slice(0, 60)})` : ""} | ${r.followers_count?.toLocaleString() ?? "—"} | ${r.media_count ?? "—"} | ${r.usage.max}% |`,
      )
    })
    console.log("\nUsage headers after each call:")
    results.forEach((r, i) => console.log(`  ${i + 1}. app=${JSON.stringify(r.usage.app)} buc=${JSON.stringify(r.usage.buc)}`))
    fs.mkdirSync(REPORT_DIR, { recursive: true })
    fs.writeFileSync(path.join(REPORT_DIR, "ig-followers-preflight.json"), JSON.stringify({ at: new Date().toISOString(), version, results }, null, 2))
  }

  const remaining = ordered.filter((u) => !FINAL.has(readCache().get(u)?.status as never)).length
  console.log(`\nDone: ${results.length} lookups ${JSON.stringify(counts)} in ${((Date.now() - started) / 60000).toFixed(1)} min. Still to look up: ${remaining}.`)
  console.log(`Cache: ${CACHE_FILE}`)
  if (fatal) {
    console.error(`\nSTOPPED: ${fatal}\nProgress is saved; run the same command again later to resume.`)
    process.exit(2)
  }
}

main().catch((e) => {
  console.error((e as Error).message)
  process.exit(1)
})
