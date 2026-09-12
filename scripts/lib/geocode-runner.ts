// scripts/lib/geocode-runner.ts
// Shared chunked-submit / null-guarded-write loop used by both
// scripts/geocode-census.ts and scripts/geocode-census-retry.ts. The two
// scripts differ only in *which* rows they select and what address string
// they submit (raw vs. unit-designator-normalized) — everything after that
// (1,000-row chunking, the 2s inter-chunk pause, bounds checking, the
// null-guarded per-row write, and checkpointing) is identical, so it lives
// here once rather than as two copies that can drift.

import type { SupabaseClient } from "@supabase/supabase-js"
import pLimit from "p-limit"
import {
  buildAddressBatchCsv,
  submitAddressBatch,
  parseCensusResponse,
  assertCoordinateBounds,
} from "./census-geocoder"
import { loadCheckpoint, saveCheckpoint, type GeocodeCheckpoint } from "./geocode-checkpoint"

const CHUNK_SIZE = 1000
const CHUNK_PAUSE_MS = 2000

// The row shape actually submitted to Census: address/city/state/zip here
// are already whatever string the caller wants sent (raw, normalized,
// blanked for missing fields, etc.) — this module doesn't interpret them.
export interface GeocodeSubmissionRow {
  id: string
  name: string | null
  address: string
  city: string
  state: string
  zip: string
}

export interface GeocodeSampleRow {
  name: string
  input: string
  lat: number
  lng: number
  matchedAddress: string
}

export interface GeocodeRunResult {
  rowsProcessed: number
  matched: number
  exact: number
  nonExact: number
  noMatch: number
  tie: number
  boundsRejected: number
  writtenThisRun: number
  cumulativeWritten: number
  samples: GeocodeSampleRow[]
}

async function writeCoordinates(
  supabase: SupabaseClient,
  matches: { id: string; lat: number; lng: number }[]
): Promise<number> {
  const limit = pLimit(10)
  let written = 0
  await Promise.all(
    matches.map((m) =>
      limit(async () => {
        const { data, error } = await supabase
          .from("shops")
          .update({ latitude: m.lat, longitude: m.lng })
          .eq("id", m.id)
          .is("latitude", null) // null guard lives in the WHERE clause, not just app logic
          .select("id")
        if (error) {
          console.error(`  write failed for ${m.id}: ${error.message}`)
          return
        }
        if (data && data.length > 0) written++
      })
    )
  )
  return written
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function runChunkedGeocode(opts: {
  supabase: SupabaseClient
  candidates: GeocodeSubmissionRow[]
  checkpointPath: string
  dryRun: boolean
}): Promise<GeocodeRunResult> {
  const { supabase, candidates, checkpointPath, dryRun } = opts

  const checkpoint: GeocodeCheckpoint = dryRun
    ? { updatedAt: new Date().toISOString(), processedIds: [], totalWritten: 0 }
    : loadCheckpoint(checkpointPath)

  const totalChunks = Math.ceil(candidates.length / CHUNK_SIZE)
  const result: GeocodeRunResult = {
    rowsProcessed: candidates.length,
    matched: 0,
    exact: 0,
    nonExact: 0,
    noMatch: 0,
    tie: 0,
    boundsRejected: 0,
    writtenThisRun: 0,
    cumulativeWritten: checkpoint.totalWritten,
    samples: [],
  }

  for (let i = 0; i < totalChunks; i++) {
    const chunk = candidates.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    const csv = buildAddressBatchCsv(chunk)
    const responseText = await submitAddressBatch(csv)
    const parsed = parseCensusResponse(responseText)
    const byId = new Map(chunk.map((c) => [c.id, c]))

    const matched: { id: string; lat: number; lng: number }[] = []
    let matchedThisChunk = 0

    for (const r of parsed) {
      if (r.matchIndicator === "Match") {
        const row = byId.get(r.id)
        const context = `shop ${r.id} (${row?.name ?? "unknown"})`
        try {
          assertCoordinateBounds(r.lat!, r.lng!, context)
        } catch (err) {
          console.error(`  ⚠ BOUNDS REJECTED: ${(err as Error).message}`)
          result.boundsRejected++
          continue
        }

        matchedThisChunk++
        result.matched++
        if (r.matchType === "Exact") result.exact++
        else if (r.matchType === "Non_Exact") result.nonExact++

        matched.push({ id: r.id, lat: r.lat!, lng: r.lng! })
        if (result.samples.length < 5) {
          result.samples.push({
            name: row?.name ?? "(unknown)",
            input: r.inputAddress,
            lat: r.lat!,
            lng: r.lng!,
            matchedAddress: r.matchedAddress ?? "",
          })
        }
      } else if (r.matchIndicator === "Tie") {
        result.tie++
      } else {
        result.noMatch++
      }
    }

    let writtenThisChunk = 0
    if (!dryRun && matched.length > 0) {
      writtenThisChunk = await writeCoordinates(supabase, matched)
    }
    result.writtenThisRun += writtenThisChunk
    result.cumulativeWritten += writtenThisChunk

    console.log(
      `chunk ${i + 1}/${totalChunks} — ${matchedThisChunk}/${chunk.length} matched — ${result.cumulativeWritten.toLocaleString()} total written`
    )

    if (!dryRun) {
      checkpoint.processedIds.push(...chunk.map((c) => c.id))
      checkpoint.totalWritten = result.cumulativeWritten
      checkpoint.updatedAt = new Date().toISOString()
      saveCheckpoint(checkpointPath, checkpoint)
    }

    if (i < totalChunks - 1) await sleep(CHUNK_PAUSE_MS)
  }

  return result
}

export function loadProcessedIds(checkpointPath: string, dryRun: boolean): Set<string> {
  if (dryRun) return new Set()
  return new Set(loadCheckpoint(checkpointPath).processedIds)
}
