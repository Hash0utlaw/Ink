# TattooMaps Coverage Report

Generated: 2026-10-01T23:24:53.851Z

Counts active shops only (`is_active = true`).

## Executive Summary

| Metric | Value |
|---|---|
| Active shop rows | 26,840 |
| Usable rows (map-visible, per full USABLE definition) | 25,842 |
| Usable % | **96.3%** |
| Distinct state codes seen | 53 |
| Non-standard state codes seen | 2 |

## 1. Shop Count Per State (50 + DC)

Sorted descending by total. "Usable" = passes the full USABLE definition.

| State | Total | Usable | Usable % |
|---|---:|---:|---:|
| CA | 3,041 | 2,975 | 97.8% |
| FL | 2,885 | 2,777 | 96.3% |
| TX | 2,573 | 2,473 | 96.1% |
| NY | 1,446 | 1,410 | 97.5% |
| NC | 1,032 | 1,013 | 98.2% |
| PA | 996 | 978 | 98.2% |
| OH | 868 | 850 | 97.9% |
| WA | 740 | 726 | 98.1% |
| IL | 711 | 700 | 98.5% |
| CO | 687 | 674 | 98.1% |
| NV | 682 | 645 | 94.6% |
| AZ | 653 | 645 | 98.8% |
| MI | 626 | 612 | 97.8% |
| GA | 622 | 597 | 96.0% |
| OR | 550 | 544 | 98.9% |
| MO | 514 | 500 | 97.3% |
| IN | 507 | 500 | 98.6% |
| TN | 507 | 493 | 97.2% |
| WI | 496 | 489 | 98.6% |
| NJ | 433 | 415 | 95.8% |
| VA | 412 | 401 | 97.3% |
| MD | 407 | 397 | 97.5% |
| MA | 398 | 393 | 98.7% |
| LA | 363 | 352 | 97.0% |
| KY | 336 | 325 | 96.7% |
| MN | 321 | 318 | 99.1% |
| UT | 274 | 267 | 97.4% |
| CT | 273 | 267 | 97.8% |
| IA | 262 | 257 | 98.1% |
| AL | 261 | 248 | 95.0% |
| OK | 234 | 230 | 98.3% |
| HI | 209 | 206 | 98.6% |
| SC | 193 | 190 | 98.4% |
| AR | 186 | 183 | 98.4% |
| ID | 181 | 177 | 97.8% |
| NE | 166 | 162 | 97.6% |
| NM | 159 | 156 | 98.1% |
| NH | 149 | 146 | 98.0% |
| WV | 144 | 134 | 93.1% |
| ME | 124 | 121 | 97.6% |
| RI | 124 | 122 | 98.4% |
| MS | 112 | 108 | 96.4% |
| MT | 106 | 101 | 95.3% |
| KS | 100 | 98 | 98.0% |
| AK | 85 | 84 | 98.8% |
| DE | 82 | 81 | 98.8% |
| SD | 79 | 77 | 97.5% |
| VT | 67 | 67 | 100.0% |
| WY | 66 | 64 | 97.0% |
| ND | 61 | 61 | 100.0% |
| DC | 33 | 33 | 100.0% |

**Zero-count states (0):** none

**Rows with no state set:** 302

**Non-standard state codes found** (territories, typos, or bad data — not counted in the 50+DC table above):

| Code | Count |
|---|---:|
| NW | 1 |
| US | 1 |

## 2. Top 50 US Metros — Usable Shop Coverage

> This section only covers rows with usable coordinates (96.3% of the table). Metro boundaries are approximated via a static centroid + tiered radius (40mi/30mi/20mi by population rank) — see `scripts/lib/metros.ts`. Flagged: fewer than 15 usable shops.

| Rank | Metro | Population | Usable Shops | Flag |
|---:|---|---:|---:|---|
| 1 | New York–Newark–Jersey City, NY-NJ | 20,112,448 | 986 |  |
| 2 | Los Angeles–Long Beach–Anaheim, CA | 12,844,441 | 858 |  |
| 3 | Chicago–Naperville–Elgin, IL-IN | 9,434,123 | 432 |  |
| 4 | Dallas–Fort Worth–Arlington, TX | 8,477,157 | 614 |  |
| 5 | Houston–Pasadena–The Woodlands, TX | 7,904,627 | 493 |  |
| 6 | Atlanta–Sandy Springs–Roswell, GA | 6,482,182 | 321 |  |
| 7 | Washington–Arlington–Alexandria, DC-VA-MD-WV | 6,465,724 | 249 |  |
| 8 | Miami–Fort Lauderdale–West Palm Beach, FL | 6,391,072 | 645 |  |
| 9 | Philadelphia–Camden–Wilmington, PA-NJ-DE-MD | 6,329,118 | 366 |  |
| 10 | Phoenix–Mesa–Chandler, AZ | 5,228,938 | 415 |  |
| 11 | Boston–Cambridge–Newton, MA-NH | 5,034,221 | 187 |  |
| 12 | Riverside–San Bernardino–Ontario, CA | 4,769,007 | 236 |  |
| 13 | San Francisco–Oakland–Fremont, CA | 4,630,041 | 257 |  |
| 14 | Detroit–Warren–Dearborn, MI | 4,390,913 | 216 |  |
| 15 | Seattle–Tacoma–Bellevue, WA | 4,161,883 | 342 |  |
| 16 | Minneapolis–St. Paul–Bloomington, MN-WI | 3,790,295 | 194 |  |
| 17 | Tampa–St. Petersburg–Clearwater, FL | 3,418,895 | 589 |  |
| 18 | San Diego–Chula Vista–Carlsbad, CA | 3,282,248 | 299 |  |
| 19 | Denver–Aurora–Centennial, CO | 3,092,037 | 328 |  |
| 20 | Orlando–Kissimmee–Sanford, FL | 2,957,672 | 369 |  |
| 21 | Charlotte–Concord–Gastonia, NC-SC | 2,938,830 | 203 |  |
| 22 | Baltimore–Columbia–Towson, MD | 2,857,781 | 187 |  |
| 23 | St. Louis, MO-IL | 2,814,421 | 120 |  |
| 24 | San Antonio–New Braunfels, TX | 2,813,140 | 197 |  |
| 25 | Austin–Round Rock–San Marcos, TX | 2,620,945 | 222 |  |
| 26 | Portland–Vancouver–Hillsboro, OR-WA | 2,542,282 | 324 |  |
| 27 | Sacramento–Roseville–Folsom, CA | 2,477,274 | 178 |  |
| 28 | Pittsburgh, PA | 2,421,992 | 160 |  |
| 29 | Las Vegas–Henderson–North Las Vegas, NV | 2,407,226 | 520 |  |
| 30 | Cincinnati, OH-KY-IN | 2,312,858 | 127 |  |
| 31 | Kansas City, MO-KS | 2,270,682 | 143 |  |
| 32 | Columbus, OH | 2,242,028 | 104 |  |
| 33 | Indianapolis–Carmel–Greenwood, IN | 2,205,695 | 112 |  |
| 34 | Nashville-Davidson–Murfreesboro–Franklin, TN | 2,197,416 | 109 |  |
| 35 | Cleveland, OH | 2,165,775 | 97 |  |
| 36 | San Jose–Sunnyvale–Santa Clara, CA | 1,984,473 | 99 |  |
| 37 | Virginia Beach–Norfolk–Newport News, VA-NC | 1,797,213 | 66 |  |
| 38 | Jacksonville, FL | 1,785,500 | 185 |  |
| 39 | Providence–Warwick, RI-MA | 1,708,161 | 142 |  |
| 40 | Raleigh–Cary, NC | 1,595,720 | 151 |  |
| 41 | Milwaukee–Waukesha, WI | 1,575,010 | 116 |  |
| 42 | Oklahoma City, OK | 1,512,813 | 104 |  |
| 43 | Louisville/Jefferson County, KY-IN | 1,402,509 | 101 |  |
| 44 | Richmond, VA | 1,389,338 | 74 |  |
| 45 | Memphis, TN-MS-AR | 1,341,412 | 55 |  |
| 46 | Salt Lake City–Murray, UT | 1,308,377 | 149 |  |
| 47 | Fresno, CA | 1,203,383 | 79 |  |
| 48 | Birmingham, AL | 1,197,766 | 38 |  |
| 49 | Grand Rapids–Wyoming–Kentwood, MI | 1,183,645 | 71 |  |
| 50 | Hartford–West Hartford–East Hartford, CT | 1,171,426 | 102 |  |

**Metros below threshold (0 of 50):** none

**Usable shops outside every top-50 metro radius (or lacking coordinates):** 14,109

## 3. Duplicate Detection

Same normalized (name + address), different `place_id`.

- Duplicate clusters: **2**
- Rows involved: **4**

Sample (first 2 clusters — full list in coverage-report.json):

| Name | Address | Rows | place_ids |
|---|---|---:|---|
| Oakland Ink | 400 14th St, Oakland, CA 94612 | 2 | overture:6c56c5b6-de8c-497b-a32d-99559e74e12b, overture:c0a4d033-a1c5-4a7a-8df6-fec8533d91fa |
| Reclamare Gallery & Custom | 2737 Riverside Blvd, Sacramento, CA 95818 | 2 | overture:fafdf2af-f3b4-4613-923a-51c76db5c163, ChIJQ32LPBrRmoARKuxyecnRqZY |

## 4. Field Completeness (all 26,840 active shop rows)

| Field | Populated | Total | % |
|---|---:|---:|---:|
| phone | 24,239 | 26,840 | 90.3% |
| website | 20,138 | 26,840 | 75.0% |
| hours | 3,146 | 26,840 | 11.7% |
| description | 2 | 26,840 | 0.0% |
| cover_image_url | 3,489 | 26,840 | 13.0% |
| specialties (N/A — column exists only on artists) | 0 | 26,840 | 0.0% |
