// scripts/lib/summary.ts
// Shared end-of-run summary printer for the import scripts — consistent
// "rows read / skipped (why) / inserted / ignored as duplicate" reporting
// across all three importers, per Task 2's spec.

export interface SkipReason {
  reason: string
  count: number
}

export function printImportSummary(parts: {
  rowsRead: number
  skipped: SkipReason[]
  inserted: number
  ignoredDuplicates: number
}): void {
  console.log("\n── Summary ─────────────────────────────────")
  console.log(`Rows read:                ${parts.rowsRead}`)
  for (const s of parts.skipped) {
    console.log(`Rows skipped (${s.reason}): ${s.count}`)
  }
  console.log(`Rows inserted:            ${parts.inserted}`)
  console.log(`Rows ignored (duplicate): ${parts.ignoredDuplicates}`)
  console.log("────────────────────────────────────────────\n")
}
