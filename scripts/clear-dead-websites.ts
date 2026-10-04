// clear-dead-websites.ts
// Google shut down Business Profile websites (*.business.site / *.negocio.site)
// in 2024, so those URLs are dead links. Sets shops.website = NULL for them.
// Run: npx tsx scripts/clear-dead-websites.ts [--apply]
//   Dry-run by default; --apply writes (undo-logged).

import { config } from "dotenv"
config({ path: ".env.local" })

import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog, loggedUpdate } from "./lib/undo-log"
import { fetchAll, modeBanner, runPool } from "./lib/cleanup-utils"

const ARGS = parseScriptArgs()
const DEAD = /(business|negocio)\.site/i

async function main() {
  modeBanner(ARGS.apply)
  const supabase = getSupabaseAdmin()
  const shops = await fetchAll(supabase, "shops", "id, name, city, state, website", (q) =>
    q.or("website.ilike.%business.site%,website.ilike.%negocio.site%")
  )
  const dead = shops.filter((s) => DEAD.test(String(s.website ?? "")))

  console.log(`── Summary ──`)
  console.log(`Shops with a business.site / negocio.site website: ${dead.length}`)
  console.log(`Samples:`)
  for (const s of dead.slice(0, 10)) console.log(`  ${s.name} (${s.city}, ${s.state}) — ${s.website}`)

  if (!ARGS.apply) {
    console.log(`\nDRY RUN — would set website = NULL on ${dead.length} shops. Re-run with --apply to write.`)
    return
  }

  const undo = new UndoLog("clear-dead-websites")
  let done = 0
  await runPool(dead, 10, async (s) => {
    await loggedUpdate(supabase, undo, "shops", String(s.id), s, { website: null })
    done++
  })
  console.log(`\nCleared ${done} websites. Undo log: ${undo.file}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
