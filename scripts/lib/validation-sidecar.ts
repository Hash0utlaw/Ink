// scripts/lib/validation-sidecar.ts
// Enforcement mechanism for Task 3's "no CSV gets imported until it has
// passed validate-import.ts" rule. A bare --validated flag with nothing
// behind it would prove nothing — anyone could pass it unconditionally. So
// validate-import.ts, on a passing run, writes a sidecar file next to the
// CSV containing a content hash + timestamp; import scripts recompute the
// hash and refuse to proceed unless it matches and is recent enough.

import fs from "fs"
import crypto from "crypto"

const FRESHNESS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface Sidecar {
  inputPath: string
  sha256: string
  rowCount: number
  validatedAt: string
}

function sidecarPath(csvPath: string): string {
  return `${csvPath}.validated.json`
}

export function sha256OfFile(csvPath: string): string {
  const buf = fs.readFileSync(csvPath)
  return crypto.createHash("sha256").update(buf).digest("hex")
}

export function writeSidecar(csvPath: string, rowCount: number): string {
  const sidecar: Sidecar = {
    inputPath: csvPath,
    sha256: sha256OfFile(csvPath),
    rowCount,
    validatedAt: new Date().toISOString(),
  }
  const file = sidecarPath(csvPath)
  fs.writeFileSync(file, JSON.stringify(sidecar, null, 2))
  return file
}

export function checkSidecar(csvPath: string): { valid: boolean; reason?: string } {
  const file = sidecarPath(csvPath)
  if (!fs.existsSync(file)) {
    return { valid: false, reason: `No validation record found (${file}). Run: npx tsx scripts/validate-import.ts --input ${csvPath}` }
  }

  let sidecar: Sidecar
  try {
    sidecar = JSON.parse(fs.readFileSync(file, "utf-8"))
  } catch {
    return { valid: false, reason: `Validation record ${file} is unreadable/corrupt. Re-run validate-import.ts.` }
  }

  const currentHash = sha256OfFile(csvPath)
  if (currentHash !== sidecar.sha256) {
    return { valid: false, reason: `${csvPath} has changed since it was validated. Re-run validate-import.ts.` }
  }

  const age = Date.now() - new Date(sidecar.validatedAt).getTime()
  if (age > FRESHNESS_WINDOW_MS) {
    return { valid: false, reason: `Validation for ${csvPath} is more than 7 days old (validated ${sidecar.validatedAt}). Re-run validate-import.ts.` }
  }

  return { valid: true }
}
