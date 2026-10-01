# TattooMaps Coverage Report

Generated: 2026-10-01T22:59:03.799Z

Counts active shops only (`is_active = true`).

## Executive Summary

| Metric | Value |
|---|---|
| Active shop rows | 24,320 |
| Usable rows (map-visible, per full USABLE definition) | 23,322 |
| Usable % | **95.9%** |
| Distinct state codes seen | 53 |
| Non-standard state codes seen | 2 |

## 1. Shop Count Per State (50 + DC)

Sorted descending by total. "Usable" = passes the full USABLE definition.

| State | Total | Usable | Usable % |
|---|---:|---:|---:|
| CA | 2,865 | 2,799 | 97.7% |
| FL | 2,734 | 2,626 | 96.0% |
| TX | 2,385 | 2,285 | 95.8% |
| NY | 1,282 | 1,246 | 97.2% |
| NC | 961 | 942 | 98.0% |
| PA | 865 | 847 | 97.9% |
| OH | 771 | 753 | 97.7% |
| WA | 668 | 654 | 97.9% |
| NV | 659 | 622 | 94.4% |
| IL | 613 | 602 | 98.2% |
| CO | 599 | 586 | 97.8% |
| AZ | 563 | 555 | 98.6% |
| MI | 546 | 532 | 97.4% |
| GA | 525 | 500 | 95.2% |
| OR | 506 | 500 | 98.8% |
| MO | 459 | 445 | 96.9% |
| IN | 445 | 438 | 98.4% |
| TN | 445 | 431 | 96.9% |
| WI | 436 | 429 | 98.4% |
| NJ | 377 | 359 | 95.2% |
| MD | 376 | 366 | 97.3% |
| VA | 367 | 356 | 97.0% |
| MA | 354 | 349 | 98.6% |
| LA | 346 | 335 | 96.8% |
| KY | 304 | 293 | 96.4% |
| MN | 291 | 288 | 99.0% |
| CT | 249 | 243 | 97.6% |
| UT | 240 | 233 | 97.1% |
| IA | 228 | 223 | 97.8% |
| AL | 224 | 211 | 94.2% |
| OK | 205 | 201 | 98.0% |
| HI | 182 | 179 | 98.4% |
| AR | 165 | 162 | 98.2% |
| ID | 156 | 152 | 97.4% |
| SC | 156 | 153 | 98.1% |
| NE | 148 | 144 | 97.3% |
| NM | 146 | 143 | 97.9% |
| NH | 136 | 133 | 97.8% |
| WV | 127 | 117 | 92.1% |
| RI | 110 | 108 | 98.2% |
| ME | 108 | 105 | 97.2% |
| MS | 92 | 88 | 95.7% |
| MT | 89 | 84 | 94.4% |
| KS | 86 | 84 | 97.7% |
| AK | 79 | 78 | 98.7% |
| DE | 75 | 74 | 98.7% |
| SD | 70 | 68 | 97.1% |
| VT | 62 | 62 | 100.0% |
| WY | 56 | 54 | 96.4% |
| ND | 52 | 52 | 100.0% |
| DC | 33 | 33 | 100.0% |

**Zero-count states (0):** none

**Rows with no state set:** 302

**Non-standard state codes found** (territories, typos, or bad data — not counted in the 50+DC table above):

| Code | Count |
|---|---:|
| NW | 1 |
| US | 1 |

## 2. Top 50 US Metros — Usable Shop Coverage

> This section only covers rows with usable coordinates (95.9% of the table). Metro boundaries are approximated via a static centroid + tiered radius (40mi/30mi/20mi by population rank) — see `scripts/lib/metros.ts`. Flagged: fewer than 15 usable shops.

| Rank | Metro | Population | Usable Shops | Flag |
|---:|---|---:|---:|---|
| 1 | New York–Newark–Jersey City, NY-NJ | 20,112,448 | 891 |  |
| 2 | Los Angeles–Long Beach–Anaheim, CA | 12,844,441 | 810 |  |
| 3 | Chicago–Naperville–Elgin, IL-IN | 9,434,123 | 374 |  |
| 4 | Dallas–Fort Worth–Arlington, TX | 8,477,157 | 589 |  |
| 5 | Houston–Pasadena–The Woodlands, TX | 7,904,627 | 463 |  |
| 6 | Atlanta–Sandy Springs–Roswell, GA | 6,482,182 | 267 |  |
| 7 | Washington–Arlington–Alexandria, DC-VA-MD-WV | 6,465,724 | 232 |  |
| 8 | Miami–Fort Lauderdale–West Palm Beach, FL | 6,391,072 | 630 |  |
| 9 | Philadelphia–Camden–Wilmington, PA-NJ-DE-MD | 6,329,118 | 313 |  |
| 10 | Phoenix–Mesa–Chandler, AZ | 5,228,938 | 360 |  |
| 11 | Boston–Cambridge–Newton, MA-NH | 5,034,221 | 159 |  |
| 12 | Riverside–San Bernardino–Ontario, CA | 4,769,007 | 225 |  |
| 13 | San Francisco–Oakland–Fremont, CA | 4,630,041 | 236 |  |
| 14 | Detroit–Warren–Dearborn, MI | 4,390,913 | 192 |  |
| 15 | Seattle–Tacoma–Bellevue, WA | 4,161,883 | 308 |  |
| 16 | Minneapolis–St. Paul–Bloomington, MN-WI | 3,790,295 | 175 |  |
| 17 | Tampa–St. Petersburg–Clearwater, FL | 3,418,895 | 558 |  |
| 18 | San Diego–Chula Vista–Carlsbad, CA | 3,282,248 | 282 |  |
| 19 | Denver–Aurora–Centennial, CO | 3,092,037 | 286 |  |
| 20 | Orlando–Kissimmee–Sanford, FL | 2,957,672 | 345 |  |
| 21 | Charlotte–Concord–Gastonia, NC-SC | 2,938,830 | 182 |  |
| 22 | Baltimore–Columbia–Towson, MD | 2,857,781 | 172 |  |
| 23 | St. Louis, MO-IL | 2,814,421 | 110 |  |
| 24 | San Antonio–New Braunfels, TX | 2,813,140 | 170 |  |
| 25 | Austin–Round Rock–San Marcos, TX | 2,620,945 | 187 |  |
| 26 | Portland–Vancouver–Hillsboro, OR-WA | 2,542,282 | 305 |  |
| 27 | Sacramento–Roseville–Folsom, CA | 2,477,274 | 170 |  |
| 28 | Pittsburgh, PA | 2,421,992 | 138 |  |
| 29 | Las Vegas–Henderson–North Las Vegas, NV | 2,407,226 | 503 |  |
| 30 | Cincinnati, OH-KY-IN | 2,312,858 | 111 |  |
| 31 | Kansas City, MO-KS | 2,270,682 | 129 |  |
| 32 | Columbus, OH | 2,242,028 | 95 |  |
| 33 | Indianapolis–Carmel–Greenwood, IN | 2,205,695 | 97 |  |
| 34 | Nashville-Davidson–Murfreesboro–Franklin, TN | 2,197,416 | 103 |  |
| 35 | Cleveland, OH | 2,165,775 | 86 |  |
| 36 | San Jose–Sunnyvale–Santa Clara, CA | 1,984,473 | 97 |  |
| 37 | Virginia Beach–Norfolk–Newport News, VA-NC | 1,797,213 | 58 |  |
| 38 | Jacksonville, FL | 1,785,500 | 183 |  |
| 39 | Providence–Warwick, RI-MA | 1,708,161 | 125 |  |
| 40 | Raleigh–Cary, NC | 1,595,720 | 145 |  |
| 41 | Milwaukee–Waukesha, WI | 1,575,010 | 106 |  |
| 42 | Oklahoma City, OK | 1,512,813 | 92 |  |
| 43 | Louisville/Jefferson County, KY-IN | 1,402,509 | 92 |  |
| 44 | Richmond, VA | 1,389,338 | 69 |  |
| 45 | Memphis, TN-MS-AR | 1,341,412 | 50 |  |
| 46 | Salt Lake City–Murray, UT | 1,308,377 | 125 |  |
| 47 | Fresno, CA | 1,203,383 | 73 |  |
| 48 | Birmingham, AL | 1,197,766 | 31 |  |
| 49 | Grand Rapids–Wyoming–Kentwood, MI | 1,183,645 | 62 |  |
| 50 | Hartford–West Hartford–East Hartford, CT | 1,171,426 | 92 |  |

**Metros below threshold (0 of 50):** none

**Usable shops outside every top-50 metro radius (or lacking coordinates):** 12,667

## 3. Duplicate Detection

Same normalized (name + address), different `place_id`.

- Duplicate clusters: **0**
- Rows involved: **0**

## 4. Field Completeness (all 24,320 active shop rows)

| Field | Populated | Total | % |
|---|---:|---:|---:|
| phone | 21,763 | 24,320 | 89.5% |
| website | 18,284 | 24,320 | 75.2% |
| hours | 3,146 | 24,320 | 12.9% |
| description | 2 | 24,320 | 0.0% |
| cover_image_url | 3,489 | 24,320 | 14.3% |
| specialties (N/A — column exists only on artists) | 0 | 24,320 | 0.0% |
