// scripts/lib/args.ts
// Shared CLI flag parsing for scripts/*.ts. Generalizes the ad hoc getArg()
// helper already used in enrich-artists.ts / scrape-shop-artists.ts. No
// external CLI library (matches house style — no yargs/commander in the repo).

export interface ScriptArgs {
  dryRun: boolean
  validated: boolean
  input: string | null
  state: string | null
  limit: number | null
}

// Accepts both "--flag value" and "--flag=value" — a bare argv.indexOf(flag)
// match only catches the space-separated form and silently returns null
// (i.e. "not passed") for "--flag=value", which is easy to invoke by habit
// and fails with no error at all.
function getArg(flag: string, argv: string[]): string | null {
  const prefix = `${flag}=`
  const fused = argv.find((a) => a.startsWith(prefix))
  if (fused !== undefined) return fused.slice(prefix.length)

  const idx = argv.indexOf(flag)
  if (idx === -1 || idx + 1 >= argv.length) return null
  return argv[idx + 1]
}

export function parseScriptArgs(argv: string[] = process.argv.slice(2)): ScriptArgs {
  const limitRaw = getArg("--limit", argv)
  const limit = limitRaw ? parseInt(limitRaw, 10) : null
  const state = getArg("--state", argv)

  return {
    dryRun: argv.includes("--dry-run"),
    validated: argv.includes("--validated"),
    input: getArg("--input", argv),
    state: state ? state.trim().toUpperCase() : null,
    limit: limit !== null && !isNaN(limit) ? limit : null,
  }
}
