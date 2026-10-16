// The artist finder keeps every answer in the URL, so Back and refresh work:
//   /find-artist?near=Tampa%2C+FL&lat=28.00417&lng=-82.47534&r=25&style=japanese&step=style
//   /find-artist/results?near=…&lat=…&lng=…&r=25&style=japanese,blackwork&page=2
// Safe on the client and the server.

export interface FinderAnswers {
  /** "Tampa, FL", "33618" or "Near Tampa, FL". */
  near: string
  lat: number
  lng: number
  /** Radius in miles. */
  r: number
  /** Style slugs, at most 3. */
  styles: string[]
  /** Results order: nearest first (default) or most Instagram followers first. */
  sort?: FinderSort
}

export type FinderSort = "distance" | "followers"

/** ?sort=followers, else nearest first. */
export function toFinderSort(value: unknown): FinderSort {
  return value === "followers" ? "followers" : "distance"
}

function params(a: FinderAnswers): URLSearchParams {
  const p = new URLSearchParams()
  p.set("near", a.near)
  p.set("lat", a.lat.toFixed(5))
  p.set("lng", a.lng.toFixed(5))
  p.set("r", String(a.r))
  if (a.styles.length > 0) p.set("style", a.styles.join(","))
  return p
}

/** Step 1 with the answers filled in, or step 2 with `step: "style"`. */
export function finderHref(a: FinderAnswers, step?: "style"): string {
  const p = params(a)
  if (step) p.set("step", step)
  return `/find-artist?${p}`
}

export function resultsHref(a: FinderAnswers, page = 1): string {
  const p = params(a)
  if (a.sort === "followers") p.set("sort", "followers")
  if (page > 1) p.set("page", String(page))
  return `/find-artist/results?${p}`
}

/** /map starting at the same center, labelled with the place. */
export function mapHref(a: Pick<FinderAnswers, "near" | "lat" | "lng">): string {
  const p = new URLSearchParams({ lat: a.lat.toFixed(5), lng: a.lng.toFixed(5), near: a.near })
  return `/map?${p}`
}

/** "Japanese", "Japanese or Blackwork", "Japanese, Floral or Blackwork". */
export function joinStyles(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? ""
  return `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`
}

/** "1.4 mi" under 10 miles, "39 mi" from there. */
export function formatMiles(miles: number): string {
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`
}
