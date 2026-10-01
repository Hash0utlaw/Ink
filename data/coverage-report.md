# TattooMaps Coverage Report

Generated: 2026-10-01T01:37:41.224Z

## Executive Summary

| Metric | Value |
|---|---|
| Total shop rows | 25,594 |
| Usable rows (map-visible, per full USABLE definition) | 23,907 |
| Usable % | **93.4%** |
| Distinct state codes seen | 53 |
| Non-standard state codes seen | 2 |

## 1. Shop Count Per State (50 + DC)

Sorted descending by total. "Usable" = passes the full USABLE definition.

| State | Total | Usable | Usable % |
|---|---:|---:|---:|
| CA | 3,205 | 3,099 | 96.7% |
| FL | 3,015 | 2,859 | 94.8% |
| TX | 2,667 | 2,499 | 93.7% |
| NY | 1,291 | 1,227 | 95.0% |
| NC | 1,073 | 1,042 | 97.1% |
| PA | 869 | 829 | 95.4% |
| OH | 769 | 739 | 96.1% |
| NV | 738 | 696 | 94.3% |
| WA | 668 | 647 | 96.9% |
| IL | 615 | 588 | 95.6% |
| CO | 596 | 565 | 94.8% |
| AZ | 555 | 537 | 96.8% |
| MI | 546 | 518 | 94.9% |
| GA | 524 | 479 | 91.4% |
| OR | 504 | 491 | 97.4% |
| MO | 457 | 424 | 92.8% |
| TN | 444 | 412 | 92.8% |
| IN | 440 | 423 | 96.1% |
| WI | 435 | 421 | 96.8% |
| LA | 412 | 399 | 96.8% |
| MD | 384 | 360 | 93.8% |
| NJ | 380 | 328 | 86.3% |
| VA | 375 | 351 | 93.6% |
| MA | 352 | 342 | 97.2% |
| KY | 304 | 276 | 90.8% |
| MN | 290 | 281 | 96.9% |
| CT | 247 | 236 | 95.5% |
| UT | 238 | 227 | 95.4% |
| IA | 228 | 220 | 96.5% |
| AL | 222 | 198 | 89.2% |
| OK | 204 | 193 | 94.6% |
| HI | 179 | 174 | 97.2% |
| AR | 166 | 160 | 96.4% |
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
| DE | 75 | 68 | 90.7% |
| SD | 70 | 67 | 95.7% |
| VT | 62 | 60 | 96.8% |
| WY | 56 | 52 | 92.9% |
| ND | 51 | 51 | 100.0% |
| DC | 46 | 46 | 100.0% |

**Zero-count states (0):** none

**Rows with no state set:** 417

**Non-standard state codes found** (territories, typos, or bad data — not counted in the 50+DC table above):

| Code | Count |
|---|---:|
| NW | 1 |
| US | 1 |

## 2. Top 50 US Metros — Usable Shop Coverage

> This section only covers rows with usable coordinates (93.4% of the table). Metro boundaries are approximated via a static centroid + tiered radius (40mi/30mi/20mi by population rank) — see `scripts/lib/metros.ts`. Flagged: fewer than 15 usable shops.

| Rank | Metro | Population | Usable Shops | Flag |
|---:|---|---:|---:|---|
| 1 | New York–Newark–Jersey City, NY-NJ | 20,112,448 | 881 |  |
| 2 | Los Angeles–Long Beach–Anaheim, CA | 12,844,441 | 892 |  |
| 3 | Chicago–Naperville–Elgin, IL-IN | 9,434,123 | 367 |  |
| 4 | Dallas–Fort Worth–Arlington, TX | 8,477,157 | 674 |  |
| 5 | Houston–Pasadena–The Woodlands, TX | 7,904,627 | 507 |  |
| 6 | Atlanta–Sandy Springs–Roswell, GA | 6,482,182 | 260 |  |
| 7 | Washington–Arlington–Alexandria, DC-VA-MD-WV | 6,465,724 | 246 |  |
| 8 | Miami–Fort Lauderdale–West Palm Beach, FL | 6,391,072 | 707 |  |
| 9 | Philadelphia–Camden–Wilmington, PA-NJ-DE-MD | 6,329,118 | 296 |  |
| 10 | Phoenix–Mesa–Chandler, AZ | 5,228,938 | 348 |  |
| 11 | Boston–Cambridge–Newton, MA-NH | 5,034,221 | 160 |  |
| 12 | Riverside–San Bernardino–Ontario, CA | 4,769,007 | 235 |  |
| 13 | San Francisco–Oakland–Fremont, CA | 4,630,041 | 242 |  |
| 14 | Detroit–Warren–Dearborn, MI | 4,390,913 | 187 |  |
| 15 | Seattle–Tacoma–Bellevue, WA | 4,161,883 | 303 |  |
| 16 | Minneapolis–St. Paul–Bloomington, MN-WI | 3,790,295 | 168 |  |
| 17 | Tampa–St. Petersburg–Clearwater, FL | 3,418,895 | 589 |  |
| 18 | San Diego–Chula Vista–Carlsbad, CA | 3,282,248 | 330 |  |
| 19 | Denver–Aurora–Centennial, CO | 3,092,037 | 282 |  |
| 20 | Orlando–Kissimmee–Sanford, FL | 2,957,672 | 387 |  |
| 21 | Charlotte–Concord–Gastonia, NC-SC | 2,938,830 | 191 |  |
| 22 | Baltimore–Columbia–Towson, MD | 2,857,781 | 171 |  |
| 23 | St. Louis, MO-IL | 2,814,421 | 108 |  |
| 24 | San Antonio–New Braunfels, TX | 2,813,140 | 166 |  |
| 25 | Austin–Round Rock–San Marcos, TX | 2,620,945 | 181 |  |
| 26 | Portland–Vancouver–Hillsboro, OR-WA | 2,542,282 | 302 |  |
| 27 | Sacramento–Roseville–Folsom, CA | 2,477,274 | 215 |  |
| 28 | Pittsburgh, PA | 2,421,992 | 136 |  |
| 29 | Las Vegas–Henderson–North Las Vegas, NV | 2,407,226 | 570 |  |
| 30 | Cincinnati, OH-KY-IN | 2,312,858 | 108 |  |
| 31 | Kansas City, MO-KS | 2,270,682 | 123 |  |
| 32 | Columbus, OH | 2,242,028 | 95 |  |
| 33 | Indianapolis–Carmel–Greenwood, IN | 2,205,695 | 94 |  |
| 34 | Nashville-Davidson–Murfreesboro–Franklin, TN | 2,197,416 | 97 |  |
| 35 | Cleveland, OH | 2,165,775 | 86 |  |
| 36 | San Jose–Sunnyvale–Santa Clara, CA | 1,984,473 | 103 |  |
| 37 | Virginia Beach–Norfolk–Newport News, VA-NC | 1,797,213 | 55 |  |
| 38 | Jacksonville, FL | 1,785,500 | 211 |  |
| 39 | Providence–Warwick, RI-MA | 1,708,161 | 122 |  |
| 40 | Raleigh–Cary, NC | 1,595,720 | 169 |  |
| 41 | Milwaukee–Waukesha, WI | 1,575,010 | 106 |  |
| 42 | Oklahoma City, OK | 1,512,813 | 88 |  |
| 43 | Louisville/Jefferson County, KY-IN | 1,402,509 | 89 |  |
| 44 | Richmond, VA | 1,389,338 | 68 |  |
| 45 | Memphis, TN-MS-AR | 1,341,412 | 50 |  |
| 46 | Salt Lake City–Murray, UT | 1,308,377 | 121 |  |
| 47 | Fresno, CA | 1,203,383 | 72 |  |
| 48 | Birmingham, AL | 1,197,766 | 31 |  |
| 49 | Grand Rapids–Wyoming–Kentwood, MI | 1,183,645 | 59 |  |
| 50 | Hartford–West Hartford–East Hartford, CT | 1,171,426 | 89 |  |

**Metros below threshold (0 of 50):** none

**Usable shops outside every top-50 metro radius (or lacking coordinates):** 13,457

## 3. Duplicate Detection

Same normalized (name + address), different `place_id`.

- Duplicate clusters: **10**
- Rows involved: **20**

Sample (first 10 clusters — full list in coverage-report.json):

| Name | Address | Rows | place_ids |
|---|---|---:|---|
| Exclusive Ink | 927 N Main St, Salinas, 93906 | 2 | booksy:520876, booksy:1543313 |
| Freshink Tattoos Memphis | 10 N 2nd St., Memphis, 38103 | 2 | booksy:1447505, booksy:440018 |
| Chicagoat Tattoos | South chicago, Chicago, 60617 | 2 | booksy:569685, booksy:977577 |
| The Needle Box | 1733 E 75th Street, Chicago, 60649 | 2 | booksy:1227534, booksy:1185669 |
| Little man tattoos | 3438 Lennon rd, Flint, 48507 | 2 | booksy:981827, booksy:588628 |
| Tattooarte | 5380 baywater Dr, Tampa, 33615 | 2 | booksy:1172023, booksy:1172021 |
| Sleep Ink | West Little Rock, Little Rock, 72227 | 2 | booksy:1150143, booksy:1150142 |
| One blood tattoo studio | 4101 Bryan St suite 120, Dallas, TX 75204 | 2 | ChIJmxPSIQCZToYRkl6aZPXIfmM, ChIJJe9eIACZToYRPJa0-LBp49o |
| FeminINK LLC | Av. Felipe Sánchez Osorio, Carolina, 06708 | 2 | booksy:925360, booksy:925358 |
| Maydo’s Ink | 3753 Junction Blvd, Raleigh, 27603 | 2 | booksy:644111, booksy:644110 |

## 4. Field Completeness (all 25,594 shop rows)

| Field | Populated | Total | % |
|---|---:|---:|---:|
| phone | 22,335 | 25,594 | 87.3% |
| website | 17,219 | 25,594 | 67.3% |
| hours | 3,147 | 25,594 | 12.3% |
| description | 2 | 25,594 | 0.0% |
| cover_image_url | 3,493 | 25,594 | 13.6% |
| specialties (N/A — column exists only on artists) | 0 | 25,594 | 0.0% |
