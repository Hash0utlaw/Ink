// scripts/lib/args.ts
// Shared CLI flag parsing for scripts/*.ts. Generalizes the ad hoc getArg()
// helper already used in enrich-artists.ts / scrape-shop-artists.ts. No
// external CLI library (matches house style — no yargs/commander in the repo).

export interface ScriptArgs {
  dryRun: boolean
  // True only when --apply is passed. Data-cleanup scripts are dry-run by
  // default and write only with this flag (--dry-run is unrelated to it).
  apply: boolean
  validated: boolean
  input: string | null
  state: string | null
  limit: number | null
  // Open-data scripts (overture/fetch.ts, match-open-data.ts)
  withFsq: boolean
  refresh: boolean
  minConfidence: number | null
  mode: "all" | "enrich" | "insert"
  requireOpen: boolean
  requireStreet: boolean
  requireContact: boolean
  minSources: number | null
  compareTiers: boolean
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
  const minConfidenceRaw = getArg("--min-confidence", argv)
  const minConfidence = minConfidenceRaw ? parseFloat(minConfidenceRaw) : null
  const minSourcesRaw = getArg("--min-sources", argv)
  const minSources = minSourcesRaw ? parseInt(minSourcesRaw, 10) : null
  const mode = getArg("--mode", argv) ?? "all"
  if (mode !== "all" && mode !== "enrich" && mode !== "insert") {
    console.error(`--mode must be all, enrich or insert (got "${mode}")`)
    process.exit(1)
  }

  return {
    dryRun: argv.includes("--dry-run"),
    apply: argv.includes("--apply"),
    validated: argv.includes("--validated"),
    input: getArg("--input", argv),
    state: state ? state.trim().toUpperCase() : null,
    limit: limit !== null && !isNaN(limit) ? limit : null,
    withFsq: argv.includes("--with-fsq"),
    refresh: argv.includes("--refresh"),
    minConfidence: minConfidence !== null && !isNaN(minConfidence) ? minConfidence : null,
    mode,
    requireOpen: argv.includes("--require-open"),
    requireStreet: argv.includes("--require-street"),
    requireContact: argv.includes("--require-contact"),
    minSources: minSources !== null && !isNaN(minSources) ? minSources : null,
    compareTiers: argv.includes("--compare-tiers"),
  }
}
