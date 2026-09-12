// scripts/lib/geocode-checkpoint.ts
// Resumable-run bookkeeping shared by scripts/geocode-census.ts and
// scripts/geocode-census-retry.ts (each uses its own checkpoint file path).
// Records every shop id *attempted* in a chunk, matched or not, so a
// resumed run doesn't resubmit the same No_Match/Tie rows to Census on
// every restart — those rows still have null latitude and would otherwise
// look "eligible" again on the next query.

import fs from "fs"
import path from "path"

export interface GeocodeCheckpoint {
  updatedAt: string
  processedIds: string[]
  totalWritten: number
}

export function loadCheckpoint(filePath: string): GeocodeCheckpoint {
  if (!fs.existsSync(filePath)) {
    return { updatedAt: new Date().toISOString(), processedIds: [], totalWritten: 0 }
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as GeocodeCheckpoint
}

export function saveCheckpoint(filePath: string, checkpoint: GeocodeCheckpoint): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2))
}
