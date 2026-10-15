// scripts/tw/lib/fill.ts
// Per-field fill rates for parsed TattoosWizard profiles (fetch.ts and match.ts).

import type { Profile } from "./parse"

const FIELDS: [string, (p: Profile) => boolean][] = [
  ["name", (p) => !!p.name],
  ["instagram_handle", (p) => !!p.instagram_handle],
  ["instagram_followers", (p) => p.instagram_followers !== null],
  ["is_studio", (p) => p.is_studio !== null],
  ["city", (p) => !!p.city],
  ["state", (p) => !!p.state],
  ["country", (p) => !!p.country],
  ["main_style", (p) => !!p.main_style],
  ["style_tags", (p) => p.style_tags.length > 0],
  ["style_slugs (mapped)", (p) => p.style_slugs.length > 0],
  ["website", (p) => !!p.website],
  ["phone", (p) => !!p.phone],
  ["studio_name (artists)", (p) => p.is_studio !== true && !!p.studio_name],
  ["studio_handle (artists)", (p) => p.is_studio !== true && !!p.studio_handle],
  ["roster_urls (studios)", (p) => p.is_studio === true && p.roster_urls.length > 0],
]

export function fillRates(profiles: Profile[]): { field: string; filled: number; of: number; pct: number }[] {
  const artists = profiles.filter((p) => p.is_studio !== true).length
  const studios = profiles.filter((p) => p.is_studio === true).length
  return FIELDS.map(([field, has]) => {
    const of = field.includes("(artists)") ? artists : field.includes("(studios)") ? studios : profiles.length
    const filled = profiles.filter(has).length
    return { field, filled, of, pct: of ? (100 * filled) / of : 0 }
  })
}
