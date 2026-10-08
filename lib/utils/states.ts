export const STATE_ABBR_TO_NAME: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DC: "District of Columbia", DE: "Delaware",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", PR: "Puerto Rico", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
}

export const STATE_NAME_TO_ABBR: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ABBR_TO_NAME).map(([abbr, name]) => [name.toLowerCase(), abbr])
)

export function stateAbbrToSlug(abbr: string): string {
  const name = STATE_ABBR_TO_NAME[abbr.toUpperCase()]
  return name ? name.toLowerCase().replace(/\s+/g, "-") : abbr.toLowerCase()
}

export function stateSlugToAbbr(slug: string): string | null {
  // Try direct slug → name lookup
  const normalized = slug.toLowerCase()
  const entry = Object.entries(STATE_ABBR_TO_NAME).find(
    ([, name]) => name.toLowerCase().replace(/\s+/g, "-") === normalized
  )
  return entry ? entry[0] : null
}

/**
 * The one URL slug for a city name, used for every city link and lookup:
 * accents dropped, periods and apostrophes removed, any other run of
 * punctuation/spaces/hyphens → "-". "St. Louis" and "St Louis" → "st-louis",
 * "Coeur d'Alene" → "coeur-dalene", "Winston-Salem" → "winston-salem".
 */
export function cityToSlug(city: string): string {
  return city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.'’‘`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export interface CityGroup {
  slug: string
  /** Most common spelling among the grouped rows. */
  name: string
  count: number
  /** Every raw city value that maps to this slug. */
  spellings: string[]
}

/** Groups raw city values (one per shop) by slug; spellings with the same slug are one city. */
export function groupCitiesBySlug(cities: string[]): CityGroup[] {
  const groups = new Map<string, Map<string, number>>()
  for (const city of cities) {
    const slug = cityToSlug(city ?? "")
    if (!slug) continue
    const spellings = groups.get(slug) ?? new Map<string, number>()
    spellings.set(city, (spellings.get(city) ?? 0) + 1)
    groups.set(slug, spellings)
  }
  return Array.from(groups, ([slug, spellings]) => {
    const ranked = Array.from(spellings).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    return {
      slug,
      name: ranked[0][0].trim(),
      count: ranked.reduce((sum, [, n]) => sum + n, 0),
      spellings: ranked.map(([c]) => c),
    }
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function citySlugToName(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}
