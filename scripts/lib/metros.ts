// scripts/lib/metros.ts
// Static top-50 US metro reference data used by audit-coverage.ts to bucket
// shops into metro areas. There is no CBSA/metro column anywhere in the
// schema, so this is a hardcoded approximation, not a live join.
//
// Population figures: Census Bureau CBSA population estimates (2025 vintage,
// pulled September 2026 — https://en.wikipedia.org/wiki/List_of_Metropolitan_Statistical_Areas).
// Centroids are the principal city's coordinates (or a rough two-city
// midpoint for split names like Dallas–Fort Worth), not true CBSA polygon
// centroids. This is a launch-readiness heuristic — refresh before reuse
// beyond this push, and treat the radius assignment below as approximate.

export interface Metro {
  rank: number
  name: string
  lat: number
  lng: number
  population: number
}

export const TOP_50_METROS: Metro[] = [
  { rank: 1, name: "New York–Newark–Jersey City, NY-NJ", lat: 40.7128, lng: -74.006, population: 20112448 },
  { rank: 2, name: "Los Angeles–Long Beach–Anaheim, CA", lat: 34.0522, lng: -118.2437, population: 12844441 },
  { rank: 3, name: "Chicago–Naperville–Elgin, IL-IN", lat: 41.8781, lng: -87.6298, population: 9434123 },
  { rank: 4, name: "Dallas–Fort Worth–Arlington, TX", lat: 32.85, lng: -97.15, population: 8477157 },
  { rank: 5, name: "Houston–Pasadena–The Woodlands, TX", lat: 29.7604, lng: -95.3698, population: 7904627 },
  { rank: 6, name: "Atlanta–Sandy Springs–Roswell, GA", lat: 33.749, lng: -84.388, population: 6482182 },
  { rank: 7, name: "Washington–Arlington–Alexandria, DC-VA-MD-WV", lat: 38.9072, lng: -77.0369, population: 6465724 },
  { rank: 8, name: "Miami–Fort Lauderdale–West Palm Beach, FL", lat: 25.7617, lng: -80.1918, population: 6391072 },
  { rank: 9, name: "Philadelphia–Camden–Wilmington, PA-NJ-DE-MD", lat: 39.9526, lng: -75.1652, population: 6329118 },
  { rank: 10, name: "Phoenix–Mesa–Chandler, AZ", lat: 33.4484, lng: -112.074, population: 5228938 },
  { rank: 11, name: "Boston–Cambridge–Newton, MA-NH", lat: 42.3601, lng: -71.0589, population: 5034221 },
  { rank: 12, name: "Riverside–San Bernardino–Ontario, CA", lat: 33.9806, lng: -117.3755, population: 4769007 },
  { rank: 13, name: "San Francisco–Oakland–Fremont, CA", lat: 37.7749, lng: -122.4194, population: 4630041 },
  { rank: 14, name: "Detroit–Warren–Dearborn, MI", lat: 42.3314, lng: -83.0458, population: 4390913 },
  { rank: 15, name: "Seattle–Tacoma–Bellevue, WA", lat: 47.6062, lng: -122.3321, population: 4161883 },
  { rank: 16, name: "Minneapolis–St. Paul–Bloomington, MN-WI", lat: 44.9778, lng: -93.265, population: 3790295 },
  { rank: 17, name: "Tampa–St. Petersburg–Clearwater, FL", lat: 27.9506, lng: -82.4572, population: 3418895 },
  { rank: 18, name: "San Diego–Chula Vista–Carlsbad, CA", lat: 32.7157, lng: -117.1611, population: 3282248 },
  { rank: 19, name: "Denver–Aurora–Centennial, CO", lat: 39.7392, lng: -104.9903, population: 3092037 },
  { rank: 20, name: "Orlando–Kissimmee–Sanford, FL", lat: 28.5383, lng: -81.3792, population: 2957672 },
  { rank: 21, name: "Charlotte–Concord–Gastonia, NC-SC", lat: 35.2271, lng: -80.8431, population: 2938830 },
  { rank: 22, name: "Baltimore–Columbia–Towson, MD", lat: 39.2904, lng: -76.6122, population: 2857781 },
  { rank: 23, name: "St. Louis, MO-IL", lat: 38.627, lng: -90.1994, population: 2814421 },
  { rank: 24, name: "San Antonio–New Braunfels, TX", lat: 29.4241, lng: -98.4936, population: 2813140 },
  { rank: 25, name: "Austin–Round Rock–San Marcos, TX", lat: 30.2672, lng: -97.7431, population: 2620945 },
  { rank: 26, name: "Portland–Vancouver–Hillsboro, OR-WA", lat: 45.5152, lng: -122.6784, population: 2542282 },
  { rank: 27, name: "Sacramento–Roseville–Folsom, CA", lat: 38.5816, lng: -121.4944, population: 2477274 },
  { rank: 28, name: "Pittsburgh, PA", lat: 40.4406, lng: -79.9959, population: 2421992 },
  { rank: 29, name: "Las Vegas–Henderson–North Las Vegas, NV", lat: 36.1699, lng: -115.1398, population: 2407226 },
  { rank: 30, name: "Cincinnati, OH-KY-IN", lat: 39.1031, lng: -84.512, population: 2312858 },
  { rank: 31, name: "Kansas City, MO-KS", lat: 39.0997, lng: -94.5786, population: 2270682 },
  { rank: 32, name: "Columbus, OH", lat: 39.9612, lng: -82.9988, population: 2242028 },
  { rank: 33, name: "Indianapolis–Carmel–Greenwood, IN", lat: 39.7684, lng: -86.1581, population: 2205695 },
  { rank: 34, name: "Nashville-Davidson–Murfreesboro–Franklin, TN", lat: 36.1627, lng: -86.7816, population: 2197416 },
  { rank: 35, name: "Cleveland, OH", lat: 41.4993, lng: -81.6944, population: 2165775 },
  { rank: 36, name: "San Jose–Sunnyvale–Santa Clara, CA", lat: 37.3382, lng: -121.8863, population: 1984473 },
  { rank: 37, name: "Virginia Beach–Norfolk–Newport News, VA-NC", lat: 36.8529, lng: -75.978, population: 1797213 },
  { rank: 38, name: "Jacksonville, FL", lat: 30.3322, lng: -81.6557, population: 1785500 },
  { rank: 39, name: "Providence–Warwick, RI-MA", lat: 41.824, lng: -71.4128, population: 1708161 },
  { rank: 40, name: "Raleigh–Cary, NC", lat: 35.7796, lng: -78.6382, population: 1595720 },
  { rank: 41, name: "Milwaukee–Waukesha, WI", lat: 43.0389, lng: -87.9065, population: 1575010 },
  { rank: 42, name: "Oklahoma City, OK", lat: 35.4676, lng: -97.5164, population: 1512813 },
  { rank: 43, name: "Louisville/Jefferson County, KY-IN", lat: 38.2527, lng: -85.7585, population: 1402509 },
  { rank: 44, name: "Richmond, VA", lat: 37.5407, lng: -77.436, population: 1389338 },
  { rank: 45, name: "Memphis, TN-MS-AR", lat: 35.1495, lng: -90.049, population: 1341412 },
  { rank: 46, name: "Salt Lake City–Murray, UT", lat: 40.7608, lng: -111.891, population: 1308377 },
  { rank: 47, name: "Fresno, CA", lat: 36.7378, lng: -119.7871, population: 1203383 },
  { rank: 48, name: "Birmingham, AL", lat: 33.5186, lng: -86.8104, population: 1197766 },
  { rank: 49, name: "Grand Rapids–Wyoming–Kentwood, MI", lat: 42.9634, lng: -85.6681, population: 1183645 },
  { rank: 50, name: "Hartford–West Hartford–East Hartford, CT", lat: 41.7658, lng: -72.6734, population: 1171426 },
]

// Tiered radius by population rank — a documented heuristic, not precise
// CBSA polygon data. Denser top-tier metros get a wider radius since their
// core+suburbs sprawl further than a fixed radius would capture; smaller
// metros get a tighter radius to avoid bleeding into neighboring metros.
function radiusForRank(rank: number): number {
  if (rank <= 10) return 40
  if (rank <= 25) return 30
  return 20
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8 // Earth radius in miles
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

// Assigns to the nearest metro whose centroid is within that metro's own
// radius (not first-match) so overlapping catchments (SF/Oakland/San Jose,
// Dallas/Fort Worth) don't double-count or mis-assign to whichever metro
// happens to be earlier in the list.
export function nearestMetro(lat: number, lng: number): { metro: Metro; distanceMi: number } | null {
  let best: { metro: Metro; distanceMi: number } | null = null
  for (const metro of TOP_50_METROS) {
    const distanceMi = haversineMiles(lat, lng, metro.lat, metro.lng)
    if (distanceMi <= radiusForRank(metro.rank)) {
      if (!best || distanceMi < best.distanceMi) best = { metro, distanceMi }
    }
  }
  return best
}
