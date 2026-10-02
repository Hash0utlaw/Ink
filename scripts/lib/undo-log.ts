// scripts/lib/undo-log.ts
// Every --apply write made by a data-cleanup script is recorded here first:
// one JSON line per changed field in data/undo/<script>-<timestamp>.jsonl.
// The line is appended synchronously BEFORE the database write, so a crash
// mid-run never leaves a change on disk without its undo record.
// scripts/undo.ts replays a file in reverse to restore the old values.

import fs from "fs"
import path from "path"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface UndoEntry {
  table: string
  id: string
  field: string
  old_value: unknown
  new_value: unknown
  script: string
  timestamp: string
}

const UNDO_DIR = path.resolve("data/undo")

export class UndoLog {
  readonly file: string
  readonly script: string
  private count = 0

  constructor(script: string) {
    this.script = script
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")
    this.file = path.join(UNDO_DIR, `${script}-${stamp}.jsonl`)
  }

  get entries(): number {
    return this.count
  }

  append(changes: Omit<UndoEntry, "script" | "timestamp">[]): void {
    if (changes.length === 0) return
    fs.mkdirSync(UNDO_DIR, { recursive: true })
    const timestamp = new Date().toISOString()
    const lines = changes
      .map((c) => JSON.stringify({ ...c, script: this.script, timestamp } satisfies UndoEntry))
      .join("\n")
    fs.appendFileSync(this.file, lines + "\n")
    this.count += changes.length
  }
}

// Logs each field in `patch` (old value taken from `oldRow`), then updates the
// row by id. Throws if the update fails — the undo line is already written,
// which is harmless: restoring a value that never changed is a no-op.
export async function loggedUpdate(
  supabase: SupabaseClient,
  undo: UndoLog,
  table: string,
  id: string,
  oldRow: Record<string, unknown>,
  patch: Record<string, unknown>
): Promise<void> {
  const fields = Object.keys(patch)
  if (fields.length === 0) return
  undo.append(
    fields.map((field) => ({ table, id, field, old_value: oldRow[field] ?? null, new_value: patch[field] }))
  )
  const { error } = await supabase.from(table).update(patch).eq("id", id)
  if (error) throw new Error(`update ${table} ${id} failed: ${error.message}`)
}
