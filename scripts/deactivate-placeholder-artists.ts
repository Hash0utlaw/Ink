// deactivate-placeholder-artists.ts
// Deactivates active artist profiles whose display_name is a placeholder
// (exact, case-insensitive): Unknown Artist, Unknown, Artist, Tattoo Artist,
// Guest Artist, Resident Artist. Never deletes; the matching shop_artists rows
// are left alone (promote-shop-artists.ts skips placeholder names).
// Run: npx tsx scripts/deactivate-placeholder-artists.ts [--apply]
//   Dry-run by default; --apply sets is_active=false, undo-logged.

import { config } from "dotenv"
config({ path: ".env.local" })

import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog, loggedUpdate } from "./lib/undo-log"
import { fetchAll, modeBanner } from "./lib/cleanup-utils"
import { withRetry } from "./lib/retry"

const ARGS = parseScriptArgs()
const NAMES = new Set(["unknown artist", "unknown", "artist", "tattoo artist", "guest artist", "resident artist"])

async function main() {
  modeBanner(ARGS.apply)
  const supabase = getSupabaseAdmin()
  const active = await withRetry("fetch artists", () =>
    fetchAll(supabase, "artists", "id, display_name, handle, shop_id, source, is_active", (q) => q.eq("is_active", true))
  )
  const matches = active.filter((a) => NAMES.has(String(a.display_name ?? "").trim().toLowerCase()))

  console.log(`Active artists scanned: ${active.length}`)
  console.log(`Placeholder names to deactivate: ${matches.length}`)
  for (const a of matches) console.log(`  "${a.display_name}" | ${a.handle} | source ${a.source} | shop ${a.shop_id}`)

  if (!ARGS.apply) {
    console.log("\nDry run — nothing written. Pass --apply to write (undo-logged).")
    return
  }
  const undo = new UndoLog("deactivate-placeholder-artists")
  for (const a of matches)
    await withRetry(`deactivate ${a.id}`, () => loggedUpdate(supabase, undo, "artists", String(a.id), a, { is_active: false }))
  console.log(`\nDeactivated ${matches.length} artists. Undo log: ${undo.file} (${undo.entries} entries)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
