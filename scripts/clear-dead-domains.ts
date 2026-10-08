// clear-dead-domains.ts
// Clears shops.website when the site's domain no longer exists in DNS.
// Only checks active shops whose website fetch failed in
// data/scrape-artists-checkpoint.json (status "fetch_failed"). A domain is
// dead only when both the bare host and its www. variant fail with ENOTFOUND
// (NXDOMAIN); timeouts and every other error count as not dead.
// Run: npx tsx scripts/clear-dead-domains.ts [--apply --expect N]
//   Dry-run by default; --apply sets website = NULL on dead ones (undo-logged)
//   and changes nothing else. DNS is re-checked on apply, so --expect N (the
//   dry run's dead count) aborts before any write if the count has changed.

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import { promises as dns } from "dns"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog, loggedUpdate } from "./lib/undo-log"
import { fetchIn, modeBanner, runPool } from "./lib/cleanup-utils"
import { withRetry } from "./lib/retry"

const ARGS = parseScriptArgs()
const CHECKPOINT = "data/scrape-artists-checkpoint.json"
const CONCURRENCY = 30
const TIMEOUT_MS = 5000
const EXPECT = (() => {
  const i = process.argv.indexOf("--expect")
  return i === -1 ? null : Number(process.argv[i + 1])
})()

type Verdict = "dead" | "alive" | "error"

function hostOf(website: string): string | null {
  try {
    const url = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`)
    return url.hostname.toLowerCase().replace(/\.$/, "") || null
  } catch {
    return null
  }
}

// "dead" only on ENOTFOUND; a timeout or any other error is "error" (not dead).
async function lookup(host: string): Promise<Verdict> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<Verdict>((resolve) => {
    timer = setTimeout(() => resolve("error"), TIMEOUT_MS)
  })
  const query = dns.resolve(host).then(
    (): Verdict => "alive",
    (e: NodeJS.ErrnoException): Verdict => (e.code === "ENOTFOUND" ? "dead" : "error")
  )
  try {
    return await Promise.race([query, timeout])
  } finally {
    clearTimeout(timer)
  }
}

async function main() {
  modeBanner(ARGS.apply)
  const supabase = getSupabaseAdmin()

  const checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT, "utf-8")) as Record<string, { status?: string }>
  const failedIds = Object.entries(checkpoint)
    .filter(([, v]) => v?.status === "fetch_failed")
    .map(([id]) => id)
  const shops = (
    await withRetry("fetch shops", () =>
      fetchIn(supabase, "shops", "id, name, city, state, website, is_active", "id", failedIds)
    )
  ).filter((s) => s.is_active === true && String(s.website ?? "").trim())

  const results: { shop: Record<string, unknown>; host: string | null; verdict: Verdict }[] = []
  await runPool(shops, CONCURRENCY, async (shop) => {
    const host = hostOf(String(shop.website))
    if (!host) {
      results.push({ shop, host, verdict: "error" })
      return
    }
    const bare = host.replace(/^www\./, "")
    const [a, b] = await Promise.all([lookup(bare), lookup(`www.${bare}`)])
    results.push({ shop, host, verdict: a === "dead" && b === "dead" ? "dead" : a === "alive" || b === "alive" ? "alive" : "error" })
  })

  const dead = results.filter((r) => r.verdict === "dead").sort((x, y) => String(x.shop.id).localeCompare(String(y.shop.id)))
  const errors = results.filter((r) => r.verdict === "error").length
  console.log(`fetch_failed in checkpoint: ${failedIds.length}`)
  console.log(`Active shops with a website checked: ${results.length}`)
  console.log(`Dead (both variants ENOTFOUND): ${dead.length}`)
  console.log(`Not dead: ${results.length - dead.length} (resolves: ${results.length - dead.length - errors}, timeout/other error: ${errors})`)
  console.log(`\nDead samples (name | city, state | website):`)
  for (const r of dead.slice(0, 20)) console.log(`  ${r.shop.name} | ${r.shop.city}, ${r.shop.state} | ${r.shop.website}`)

  if (!ARGS.apply) {
    console.log(`\nDry run — would set website = NULL on ${dead.length} shops. Pass --apply to write (undo-logged).`)
    return
  }

  if (EXPECT === null || EXPECT !== dead.length) {
    console.error(`\nAborted before writing: dead count ${dead.length} doesn't match --expect ${EXPECT ?? "(missing)"}.`)
    process.exit(1)
  }
  const undo = new UndoLog("clear-dead-domains")
  let done = 0
  await runPool(dead, 10, async ({ shop }) => {
    await withRetry(`clear ${shop.id}`, () => loggedUpdate(supabase, undo, "shops", String(shop.id), shop, { website: null }))
    done++
  })
  console.log(`\nCleared ${done} websites. Undo log: ${undo.file} (${undo.entries} entries)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
