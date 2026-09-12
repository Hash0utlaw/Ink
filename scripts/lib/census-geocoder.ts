// scripts/lib/census-geocoder.ts
// Shared Census Bureau batch-geocoder plumbing for scripts/geocode-census.ts
// and scripts/geocode-census-retry.ts: CSV build/parse (both directions),
// the multipart POST, and the coordinate sanity gate. Kept separate from
// both entrypoints so the retry script's normalized-address resubmission
// exercises the exact same parsing/bounds code as the first pass — no
// second hand-rolled copy to drift out of sync.

const CENSUS_ENDPOINT = "https://geocoding.geo.census.gov/geocoder/locations/addressbatch"

// The batch geocoder's coordinates column comes back as "longitude,latitude"
// (X,Y order) — reversing this silently puts every shop in the wrong
// hemisphere, so every parsed pair is asserted against these bounds before
// it's allowed anywhere near a write. Floor is 18, not the continental-US 24,
// because Hawaii runs 18.9-22.2N — 178 HI shops in this table need exactly
// this pass, and a 24 floor would reject every one of them as "wrong
// hemisphere" when they're correctly matched.
export const US_LAT_MIN = 18
export const US_LAT_MAX = 72
export const US_LNG_MIN = -180
export const US_LNG_MAX = -66

export interface GeocodeCandidate {
  id: string
  address: string
  city: string
  state: string
  zip: string
}

export interface CensusResultRow {
  id: string
  inputAddress: string
  matchIndicator: string // "Match" | "No_Match" | "Tie"
  matchType?: string // "Exact" | "Non_Exact"
  matchedAddress?: string
  lat?: number
  lng?: number
  tigerLineId?: string
  side?: string
}

// ── CSV (request side) ──────────────────────────────────────────────────────

function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildAddressBatchCsv(rows: GeocodeCandidate[]): string {
  return rows
    .map((r) => [r.id, r.address, r.city, r.state, r.zip].map(csvField).join(","))
    .join("\r\n")
}

// ── CSV (response side) ──────────────────────────────────────────────────────
// Same quote-aware state machine as import-booksy-shops.ts's parseCSV, minus
// the header handling — the Census response has none, and its own quoted
// "matched address" / "lon,lat" fields can contain embedded commas.

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = i + 1 < text.length ? text[i + 1] : ""
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++ }
      else if (ch === '"') { inQuotes = false }
      else { field += ch }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ",") { row.push(field); field = "" }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && next === "\n") i++
        row.push(field); field = ""
        if (row.some((f) => f.length > 0)) rows.push(row)
        row = []
      } else { field += ch }
    }
  }
  row.push(field)
  if (row.some((f) => f.length > 0)) rows.push(row)
  return rows
}

export function parseCensusResponse(text: string): CensusResultRow[] {
  return parseCsvRows(text).map((r) => {
    const [id, inputAddress, matchIndicator, matchType, matchedAddress, coordinates, tigerLineId, side] = r
    const result: CensusResultRow = { id, inputAddress, matchIndicator }
    if (matchIndicator === "Match" && coordinates) {
      const commaAt = coordinates.indexOf(",")
      const lngStr = coordinates.slice(0, commaAt)
      const latStr = coordinates.slice(commaAt + 1)
      result.matchType = matchType
      result.matchedAddress = matchedAddress
      result.lng = parseFloat(lngStr)
      result.lat = parseFloat(latStr)
      result.tigerLineId = tigerLineId
      result.side = side
    }
    return result
  })
}

// ── Network ──────────────────────────────────────────────────────────────────

export async function submitAddressBatch(
  csvContent: string,
  benchmark = "Public_AR_Current"
): Promise<string> {
  const form = new FormData()
  form.append("addressFile", new Blob([csvContent], { type: "text/csv" }), "batch.csv")
  form.append("benchmark", benchmark)

  const res = await fetch(CENSUS_ENDPOINT, { method: "POST", body: form })
  if (!res.ok) {
    throw new Error(`Census geocoder HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`)
  }
  return res.text()
}

// ── Bounds gate ──────────────────────────────────────────────────────────────

export function assertCoordinateBounds(lat: number, lng: number, context: string): void {
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error(`Census geocoder: parsed NaN coordinate for ${context} (lat=${lat}, lng=${lng})`)
  }
  if (lat < US_LAT_MIN || lat > US_LAT_MAX || lng < US_LNG_MIN || lng > US_LNG_MAX) {
    throw new Error(
      `Census geocoder: coordinate out of expected US bounds for ${context} ` +
        `(lat=${lat}, lng=${lng}; expected lat ${US_LAT_MIN}..${US_LAT_MAX}, lng ${US_LNG_MIN}..${US_LNG_MAX}). ` +
        `This usually means the coordinates field was parsed in the wrong order.`
    )
  }
}
