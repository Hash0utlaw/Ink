# TattooMaps Coverage Report

Generated: 2026-10-01T01:55:26.332Z

Counts active shops only (`is_active = true`).

## Executive Summary

| Metric | Value |
|---|---|
| Active shop rows | 24,320 |
| Usable rows (map-visible, per full USABLE definition) | 22,633 |
| Usable % | **93.1%** |
| Distinct state codes seen | 53 |
| Non-standard state codes seen | 2 |

## 1. Shop Count Per State (50 + DC)

Sorted descending by total. "Usable" = passes the full USABLE definition.

| State | Total | Usable | Usable % |
|---|---:|---:|---:|
| CA | 2,854 | 2,748 | 96.3% |
| FL | 2,728 | 2,572 | 94.3% |
| TX | 2,376 | 2,208 | 92.9% |
| NY | 1,278 | 1,214 | 95.0% |
| NC | 959 | 928 | 96.8% |
| PA | 859 | 819 | 95.3% |
| OH | 768 | 738 | 96.1% |
| WA | 666 | 645 | 96.8% |
| NV | 654 | 612 | 93.6% |
| IL | 612 | 585 | 95.6% |
| CO | 596 | 565 | 94.8% |
| AZ | 555 | 537 | 96.8% |
| MI | 544 | 516 | 94.9% |
| GA | 523 | 478 | 91.4% |
| OR | 504 | 491 | 97.4% |
| MO | 457 | 424 | 92.8% |
| TN | 443 | 411 | 92.8% |
| IN | 440 | 423 | 96.1% |
| WI | 434 | 420 | 96.8% |
| MD | 375 | 351 | 93.6% |
| NJ | 374 | 322 | 86.1% |
| VA | 366 | 342 | 93.4% |
| MA | 350 | 340 | 97.1% |
| LA | 345 | 332 | 96.2% |
| KY | 304 | 276 | 90.8% |
| MN | 290 | 281 | 96.9% |
| CT | 245 | 234 | 95.5% |
| UT | 237 | 226 | 95.4% |
| IA | 228 | 220 | 96.5% |
| AL | 222 | 198 | 89.2% |
| OK | 204 | 193 | 94.6% |
| HI | 179 | 174 | 97.2% |
| AR | 164 | 158 | 96.3% |
| ID | 156 | 152 | 97.4% |
| SC | 154 | 143 | 92.9% |
| NE | 148 | 141 | 95.3% |
| NM | 145 | 140 | 96.6% |
| NH | 135 | 121 | 89.6% |
| WV | 125 | 99 | 79.2% |
| RI | 109 | 104 | 95.4% |
| ME | 107 | 104 | 97.2% |
| MS | 91 | 81 | 89.0% |
| MT | 89 | 81 | 91.0% |
| KS | 85 | 81 | 95.3% |
| AK | 79 | 76 | 96.2% |
| DE | 74 | 67 | 90.5% |
| SD | 70 | 67 | 95.7% |
| VT | 61 | 59 | 96.7% |
| WY | 56 | 52 | 92.9% |
| ND | 51 | 51 | 100.0% |
| DC | 33 | 33 | 100.0% |

**Zero-count states (0):** none

**Rows with no state set:** 417

**Non-standard state codes found** (territories, typos, or bad data — not counted in the 50+DC table above):

| Code | Count |
|---|---:|
| NW | 1 |
| US | 1 |

## 2. Top 50 US Metros — Usable Shop Coverage

> This section only covers rows with usable coordinates (93.1% of the table). Metro boundaries are approximated via a static centroid + tiered radius (40mi/30mi/20mi by population rank) — see `scripts/lib/metros.ts`. Flagged: fewer than 15 usable shops.

| Rank | Metro | Population | Usable Shops | Flag |
|---:|---|---:|---:|---|
| 1 | New York–Newark–Jersey City, NY-NJ | 20,112,448 | 863 |  |
| 2 | Los Angeles–Long Beach–Anaheim, CA | 12,844,441 | 794 |  |
| 3 | Chicago–Naperville–Elgin, IL-IN | 9,434,123 | 364 |  |
| 4 | Dallas–Fort Worth–Arlington, TX | 8,477,157 | 570 |  |
| 5 | Houston–Pasadena–The Woodlands, TX | 7,904,627 | 455 |  |
| 6 | Atlanta–Sandy Springs–Roswell, GA | 6,482,182 | 259 |  |
| 7 | Washington–Arlington–Alexandria, DC-VA-MD-WV | 6,465,724 | 220 |  |
| 8 | Miami–Fort Lauderdale–West Palm Beach, FL | 6,391,072 | 623 |  |
| 9 | Philadelphia–Camden–Wilmington, PA-NJ-DE-MD | 6,329,118 | 296 |  |
| 10 | Phoenix–Mesa–Chandler, AZ | 5,228,938 | 348 |  |
| 11 | Boston–Cambridge–Newton, MA-NH | 5,034,221 | 158 |  |
| 12 | Riverside–San Bernardino–Ontario, CA | 4,769,007 | 222 |  |
| 13 | San Francisco–Oakland–Fremont, CA | 4,630,041 | 232 |  |
| 14 | Detroit–Warren–Dearborn, MI | 4,390,913 | 186 |  |
| 15 | Seattle–Tacoma–Bellevue, WA | 4,161,883 | 303 |  |
| 16 | Minneapolis–St. Paul–Bloomington, MN-WI | 3,790,295 | 168 |  |
| 17 | Tampa–St. Petersburg–Clearwater, FL | 3,418,895 | 549 |  |
| 18 | San Diego–Chula Vista–Carlsbad, CA | 3,282,248 | 277 |  |
| 19 | Denver–Aurora–Centennial, CO | 3,092,037 | 282 |  |
| 20 | Orlando–Kissimmee–Sanford, FL | 2,957,672 | 336 |  |
| 21 | Charlotte–Concord–Gastonia, NC-SC | 2,938,830 | 179 |  |
| 22 | Baltimore–Columbia–Towson, MD | 2,857,781 | 167 |  |
| 23 | St. Louis, MO-IL | 2,814,421 | 108 |  |
| 24 | San Antonio–New Braunfels, TX | 2,813,140 | 159 |  |
| 25 | Austin–Round Rock–San Marcos, TX | 2,620,945 | 180 |  |
| 26 | Portland–Vancouver–Hillsboro, OR-WA | 2,542,282 | 302 |  |
| 27 | Sacramento–Roseville–Folsom, CA | 2,477,274 | 170 |  |
| 28 | Pittsburgh, PA | 2,421,992 | 136 |  |
| 29 | Las Vegas–Henderson–North Las Vegas, NV | 2,407,226 | 496 |  |
| 30 | Cincinnati, OH-KY-IN | 2,312,858 | 108 |  |
| 31 | Kansas City, MO-KS | 2,270,682 | 123 |  |
| 32 | Columbus, OH | 2,242,028 | 95 |  |
| 33 | Indianapolis–Carmel–Greenwood, IN | 2,205,695 | 94 |  |
| 34 | Nashville-Davidson–Murfreesboro–Franklin, TN | 2,197,416 | 97 |  |
| 35 | Cleveland, OH | 2,165,775 | 86 |  |
| 36 | San Jose–Sunnyvale–Santa Clara, CA | 1,984,473 | 94 |  |
| 37 | Virginia Beach–Norfolk–Newport News, VA-NC | 1,797,213 | 55 |  |
| 38 | Jacksonville, FL | 1,785,500 | 181 |  |
| 39 | Providence–Warwick, RI-MA | 1,708,161 | 122 |  |
| 40 | Raleigh–Cary, NC | 1,595,720 | 144 |  |
| 41 | Milwaukee–Waukesha, WI | 1,575,010 | 106 |  |
| 42 | Oklahoma City, OK | 1,512,813 | 88 |  |
| 43 | Louisville/Jefferson County, KY-IN | 1,402,509 | 89 |  |
| 44 | Richmond, VA | 1,389,338 | 68 |  |
| 45 | Memphis, TN-MS-AR | 1,341,412 | 49 |  |
| 46 | Salt Lake City–Murray, UT | 1,308,377 | 121 |  |
| 47 | Fresno, CA | 1,203,383 | 72 |  |
| 48 | Birmingham, AL | 1,197,766 | 31 |  |
| 49 | Grand Rapids–Wyoming–Kentwood, MI | 1,183,645 | 59 |  |
| 50 | Hartford–West Hartford–East Hartford, CT | 1,171,426 | 89 |  |

**Metros below threshold (0 of 50):** none

**Usable shops outside every top-50 metro radius (or lacking coordinates):** 12,947

## 3. Duplicate Detection

Same normalized (name + address), different `place_id`.

- Duplicate clusters: **0**
- Rows involved: **0**

## 4. Field Completeness (all 24,320 active shop rows)

| Field | Populated | Total | % |
|---|---:|---:|---:|
| phone | 21,169 | 24,320 | 87.0% |
| website | 16,285 | 24,320 | 67.0% |
| hours | 3,146 | 24,320 | 12.9% |
| description | 2 | 24,320 | 0.0% |
| cover_image_url | 3,489 | 24,320 | 14.3% |
| specialties (N/A — column exists only on artists) | 0 | 24,320 | 0.0% |
