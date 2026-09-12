// scripts/lib/run-log.ts
// Each real (non-dry-run) import writes a run-log to data/import-runs/ with
// its start timestamp. scripts/verify-import.ts (Task 5) reads these to know
// exactly when an import window began, so the "zero pre-existing rows
// modified" check can be scoped correctly (see verify-import.ts for why a
// single updated_at cutoff isn't sufficient).

import fs from "fs"
import path from "path"

export interface RunLog {
  script: string
  startedAt: string
  finishedAt?: string
  csvPath: string
  args: Record<string, unknown>
  rowsRead?: number
  inserted?: number
  ignoredDuplicates?: number
  skipped?: number
}

const RUN_LOG_DIR = path.resolve("data/import-runs")

export function writeRunLogStart(script: string, csvPath: string, args: Record<string, unknown>): string {
  fs.mkdirSync(RUN_LOG_DIR, { recursive: true })
  const startedAt = new Date().toISOString()
  const file = path.join(RUN_LOG_DIR, `${script}-${startedAt.replace(/[:.]/g, "-")}.json`)
  const log: RunLog = { script, startedAt, csvPath, args }
  fs.writeFileSync(file, JSON.stringify(log, null, 2))
  return file
}

export function finishRunLog(file: string, patch: Partial<RunLog>): void {
  const log = JSON.parse(fs.readFileSync(file, "utf-8")) as RunLog
  Object.assign(log, patch, { finishedAt: new Date().toISOString() })
  fs.writeFileSync(file, JSON.stringify(log, null, 2))
}
