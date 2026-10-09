import { STATE_ABBR_TO_NAME, STATE_NAME_TO_ABBR } from "@/lib/utils/states"

export type ParsedLocation = { zip?: string; city?: string; state?: string }

/** A 2-letter code or full state name ("nc", "N.C.", "north carolina") → "NC". */
function toStateAbbr(text: string): string | null {
  const t = text.replace(/\./g, "").trim().toLowerCase()
  if (t.length === 2) return STATE_ABBR_TO_NAME[t.toUpperCase()] ? t.toUpperCase() : null
  return STATE_NAME_TO_ABBR[t] ?? null
}

/** Typed all in lowercase → title case ("port charlotte" → "Port Charlotte"); otherwise as typed. */
function tidyCity(text: string): string {
  return text === text.toLowerCase() ? text.replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase()) : text
}

/**
 * Reads a typed place into search filters.
 *   "28205"                     → { zip: "28205" }
 *   "Charlotte, NC 28205"       → { zip: "28205" }
 *   "Charlotte, NC"             → { city: "Charlotte", state: "NC" }
 *   "charlotte nc"              → { city: "Charlotte", state: "NC" }
 *   "Charlotte, North Carolina" → { city: "Charlotte", state: "NC" }
 *   "Port Charlotte, FL"        → { city: "Port Charlotte", state: "FL" }
 *   "New York, NY"              → { city: "New York", state: "NY" }
 *   "North Carolina", "NC"      → { state: "NC" }
 *   "Kansas City"               → { city: "Kansas City" }
 *   "", " , "                   → null
 */
export function parseLocation(input: string): ParsedLocation | null {
  const text = input
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/^[\s,.]+|[\s,.]+$/g, "")
  if (!text) return null

  // A ZIP alone, or at the end ("Charlotte, NC 28205"): the ZIP is the most specific.
  const zip = text.match(/(?:^|[\s,])(\d{5})(?:-\d{4})?$/)
  if (zip) return { zip: zip[1] }

  const whole = toStateAbbr(text.replace(/,/g, ""))
  if (whole) return { state: whole }

  // "City, State": the state is everything after the last comma.
  const comma = text.lastIndexOf(",")
  if (comma > 0) {
    const state = toStateAbbr(text.slice(comma + 1))
    const city = text.slice(0, comma).replace(/,/g, "").trim()
    if (state && city) return { city: tidyCity(city), state }
  }

  // "City State": try the last three, two, then one words as the state.
  const words = text.replace(/,/g, "").split(" ")
  for (let n = Math.min(3, words.length - 1); n >= 1; n--) {
    const state = toStateAbbr(words.slice(-n).join(" "))
    if (state) return { city: tidyCity(words.slice(0, -n).join(" ")), state }
  }

  return { city: tidyCity(words.join(" ")) }
}

/** "Charlotte, NC", "28205" or "North Carolina", for headings and messages. */
export function formatLocation({ zip, city, state }: ParsedLocation): string {
  if (zip) return zip
  if (city && state) return `${city}, ${state}`
  if (city) return city
  return state ? (STATE_ABBR_TO_NAME[state] ?? state) : ""
}
