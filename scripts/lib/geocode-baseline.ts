// scripts/lib/geocode-baseline.ts
// One-time, write-once snapshot of every shop row that already had
// coordinates *before* this geocoding effort touched the table. Captured on
// the first real (non-dry-run) write across the whole geocode-* pipeline,
// guarded by a file-exists check so a later run can never overwrite it with
// already-mutated state. scripts/audit-coverage.ts (Task 6) reads it back to
// confirm none of those pre-existing rows changed value.

import fs from "fs"
import path from "path"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface BaselineCoordRow {
  id: string
  latitude: number
  longitude: number
}

export interface BaselineSnapshot {
  capturedAt: string
  rows: BaselineCoordRow[]
}

const BASELINE_PATH = path.resolve("data/geocode-baseline-coords.json")

export function baselineExists(): boolean {
  return fs.existsSync(BASELINE_PATH)
}

export async function captureBaselineIfMissing(supabase: SupabaseClient): Promise<void> {
  if (baselineExists()) return

  console.log("Capturing one-time baseline snapshot of pre-existing coordinates...")
  const rows: BaselineCoordRow[] = []
  const PAGE = 1000
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from("shops")
      .select("id, latitude, longitude")
      .not("latitude", "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`captureBaselineIfMissing: ${error.message}`)
    const page = (data ?? []) as BaselineCoordRow[]
    rows.push(...page)
    if (page.length < PAGE) break
    from += PAGE
  }

  fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true })
  const snapshot: BaselineSnapshot = { capturedAt: new Date().toISOString(), rows }
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(snapshot, null, 2))
  console.log(`  Captured ${rows.length.toLocaleString()} pre-existing coordinate rows -> ${BASELINE_PATH}\n`)
}

export function readBaseline(): BaselineSnapshot | null {
  if (!baselineExists()) return null
  return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf-8")) as BaselineSnapshot
}
