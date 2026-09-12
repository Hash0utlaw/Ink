# TattooMaps Coverage Report

Generated: 2026-09-11T20:52:01.931Z

## Executive Summary

| Metric | Value |
|---|---|
| Total shop rows | 25,594 |
| Usable rows (map-visible, per full USABLE definition) | 3,876 |
| Usable % | **15.1%** |
| Distinct state codes seen | 53 |
| Non-standard state codes seen | 2 |

> **Most of the table is not usable.** Only 15.1% of shop rows pass the full USABLE definition (name, address, city, valid state, non-zero lat/lng, unique slug). The remaining rows are invisible on the map today. Read every count below with that in mind — a state or metro with a large total row count can still be a real gap.

## 1. Shop Count Per State (50 + DC)

Sorted descending by total. "Usable" = passes the full USABLE definition.

| State | Total | Usable | Usable % |
|---|---:|---:|---:|
| CA | 3,205 | 858 | 26.8% |
| FL | 3,014 | 831 | 27.6% |
| TX | 2,667 | 1,048 | 39.3% |
| NY | 1,291 | 62 | 4.8% |
| NC | 1,073 | 433 | 40.4% |
| PA | 868 | 24 | 2.8% |
| OH | 769 | 12 | 1.6% |
| NV | 738 | 175 | 23.7% |
| WA | 668 | 9 | 1.3% |
| IL | 615 | 21 | 3.4% |
| CO | 596 | 13 | 2.2% |
| AZ | 555 | 5 | 0.9% |
| MI | 546 | 4 | 0.7% |
| GA | 524 | 19 | 3.6% |
| OR | 504 | 3 | 0.6% |
| MO | 457 | 6 | 1.3% |
| TN | 443 | 14 | 3.2% |
| IN | 440 | 5 | 1.1% |
| WI | 435 | 3 | 0.7% |
| LA | 412 | 207 | 50.2% |
| MD | 384 | 25 | 6.5% |
| NJ | 380 | 13 | 3.4% |
| VA | 375 | 27 | 7.2% |
| MA | 352 | 5 | 1.4% |
| KY | 304 | 5 | 1.6% |
| MN | 290 | 3 | 1.0% |
| CT | 247 | 7 | 2.8% |
| UT | 237 | 1 | 0.4% |
| IA | 228 | 0 | 0.0% |
| AL | 222 | 5 | 2.3% |
| OK | 204 | 2 | 1.0% |
| HI | 179 | 1 | 0.6% |
| AR | 166 | 4 | 2.4% |
| ID | 156 | 0 | 0.0% |
| SC | 154 | 1 | 0.6% |
| NE | 148 | 0 | 0.0% |
| NM | 145 | 0 | 0.0% |
| NH | 135 | 0 | 0.0% |
| WV | 125 | 0 | 0.0% |
| RI | 109 | 1 | 0.9% |
| ME | 107 | 0 | 0.0% |
| MS | 91 | 0 | 0.0% |
| MT | 89 | 0 | 0.0% |
| KS | 85 | 0 | 0.0% |
| AK | 79 | 0 | 0.0% |
| DE | 75 | 0 | 0.0% |
| SD | 70 | 0 | 0.0% |
| VT | 62 | 1 | 1.6% |
| WY | 56 | 0 | 0.0% |
| ND | 51 | 0 | 0.0% |
| DC | 46 | 23 | 50.0% |

**Zero-count states (0):** none

**Rows with no state set:** 421

**Non-standard state codes found** (territories, typos, or bad data — not counted in the 50+DC table above):

| Code | Count |
|---|---:|
| NW | 1 |
| US | 1 |

## 2. Top 50 US Metros — Usable Shop Coverage

> This section only covers rows with usable coordinates (15.1% of the table). Metro boundaries are approximated via a static centroid + tiered radius (40mi/30mi/20mi by population rank) — see `scripts/lib/metros.ts`. Flagged: fewer than 15 usable shops.

| Rank | Metro | Population | Usable Shops | Flag |
|---:|---|---:|---:|---|
| 1 | New York–Newark–Jersey City, NY-NJ | 20,112,448 | 69 |  |
| 2 | Los Angeles–Long Beach–Anaheim, CA | 12,844,441 | 219 |  |
| 3 | Chicago–Naperville–Elgin, IL-IN | 9,434,123 | 20 |  |
| 4 | Dallas–Fort Worth–Arlington, TX | 8,477,157 | 381 |  |
| 5 | Houston–Pasadena–The Woodlands, TX | 7,904,627 | 226 |  |
| 6 | Atlanta–Sandy Springs–Roswell, GA | 6,482,182 | 13 | ⚠️ GAP |
| 7 | Washington–Arlington–Alexandria, DC-VA-MD-WV | 6,465,724 | 55 |  |
| 8 | Miami–Fort Lauderdale–West Palm Beach, FL | 6,391,072 | 207 |  |
| 9 | Philadelphia–Camden–Wilmington, PA-NJ-DE-MD | 6,329,118 | 6 | ⚠️ GAP |
| 10 | Phoenix–Mesa–Chandler, AZ | 5,228,938 | 4 | ⚠️ GAP |
| 11 | Boston–Cambridge–Newton, MA-NH | 5,034,221 | 3 | ⚠️ GAP |
| 12 | Riverside–San Bernardino–Ontario, CA | 4,769,007 | 54 |  |
| 13 | San Francisco–Oakland–Fremont, CA | 4,630,041 | 21 |  |
| 14 | Detroit–Warren–Dearborn, MI | 4,390,913 | 2 | ⚠️ GAP |
| 15 | Seattle–Tacoma–Bellevue, WA | 4,161,883 | 2 | ⚠️ GAP |
| 16 | Minneapolis–St. Paul–Bloomington, MN-WI | 3,790,295 | 3 | ⚠️ GAP |
| 17 | Tampa–St. Petersburg–Clearwater, FL | 3,418,895 | 65 |  |
| 18 | San Diego–Chula Vista–Carlsbad, CA | 3,282,248 | 111 |  |
| 19 | Denver–Aurora–Centennial, CO | 3,092,037 | 10 | ⚠️ GAP |
| 20 | Orlando–Kissimmee–Sanford, FL | 2,957,672 | 168 |  |
| 21 | Charlotte–Concord–Gastonia, NC-SC | 2,938,830 | 53 |  |
| 22 | Baltimore–Columbia–Towson, MD | 2,857,781 | 14 | ⚠️ GAP |
| 23 | St. Louis, MO-IL | 2,814,421 | 0 | ⚠️ GAP |
| 24 | San Antonio–New Braunfels, TX | 2,813,140 | 27 |  |
| 25 | Austin–Round Rock–San Marcos, TX | 2,620,945 | 8 | ⚠️ GAP |
| 26 | Portland–Vancouver–Hillsboro, OR-WA | 2,542,282 | 2 | ⚠️ GAP |
| 27 | Sacramento–Roseville–Folsom, CA | 2,477,274 | 85 |  |
| 28 | Pittsburgh, PA | 2,421,992 | 1 | ⚠️ GAP |
| 29 | Las Vegas–Henderson–North Las Vegas, NV | 2,407,226 | 144 |  |
| 30 | Cincinnati, OH-KY-IN | 2,312,858 | 3 | ⚠️ GAP |
| 31 | Kansas City, MO-KS | 2,270,682 | 5 | ⚠️ GAP |
| 32 | Columbus, OH | 2,242,028 | 2 | ⚠️ GAP |
| 33 | Indianapolis–Carmel–Greenwood, IN | 2,205,695 | 6 | ⚠️ GAP |
| 34 | Nashville-Davidson–Murfreesboro–Franklin, TN | 2,197,416 | 1 | ⚠️ GAP |
| 35 | Cleveland, OH | 2,165,775 | 1 | ⚠️ GAP |
| 36 | San Jose–Sunnyvale–Santa Clara, CA | 1,984,473 | 21 |  |
| 37 | Virginia Beach–Norfolk–Newport News, VA-NC | 1,797,213 | 1 | ⚠️ GAP |
| 38 | Jacksonville, FL | 1,785,500 | 109 |  |
| 39 | Providence–Warwick, RI-MA | 1,708,161 | 1 | ⚠️ GAP |
| 40 | Raleigh–Cary, NC | 1,595,720 | 90 |  |
| 41 | Milwaukee–Waukesha, WI | 1,575,010 | 1 | ⚠️ GAP |
| 42 | Oklahoma City, OK | 1,512,813 | 2 | ⚠️ GAP |
| 43 | Louisville/Jefferson County, KY-IN | 1,402,509 | 6 | ⚠️ GAP |
| 44 | Richmond, VA | 1,389,338 | 3 | ⚠️ GAP |
| 45 | Memphis, TN-MS-AR | 1,341,412 | 9 | ⚠️ GAP |
| 46 | Salt Lake City–Murray, UT | 1,308,377 | 0 | ⚠️ GAP |
| 47 | Fresno, CA | 1,203,383 | 4 | ⚠️ GAP |
| 48 | Birmingham, AL | 1,197,766 | 0 | ⚠️ GAP |
| 49 | Grand Rapids–Wyoming–Kentwood, MI | 1,183,645 | 0 | ⚠️ GAP |
| 50 | Hartford–West Hartford–East Hartford, CT | 1,171,426 | 2 | ⚠️ GAP |

**Metros below threshold (31 of 50):** Atlanta–Sandy Springs–Roswell, GA; Philadelphia–Camden–Wilmington, PA-NJ-DE-MD; Phoenix–Mesa–Chandler, AZ; Boston–Cambridge–Newton, MA-NH; Detroit–Warren–Dearborn, MI; Seattle–Tacoma–Bellevue, WA; Minneapolis–St. Paul–Bloomington, MN-WI; Denver–Aurora–Centennial, CO; Baltimore–Columbia–Towson, MD; St. Louis, MO-IL; Austin–Round Rock–San Marcos, TX; Portland–Vancouver–Hillsboro, OR-WA; Pittsburgh, PA; Cincinnati, OH-KY-IN; Kansas City, MO-KS; Columbus, OH; Indianapolis–Carmel–Greenwood, IN; Nashville-Davidson–Murfreesboro–Franklin, TN; Cleveland, OH; Virginia Beach–Norfolk–Newport News, VA-NC; Providence–Warwick, RI-MA; Milwaukee–Waukesha, WI; Oklahoma City, OK; Louisville/Jefferson County, KY-IN; Richmond, VA; Memphis, TN-MS-AR; Salt Lake City–Murray, UT; Fresno, CA; Birmingham, AL; Grand Rapids–Wyoming–Kentwood, MI; Hartford–West Hartford–East Hartford, CT

**Usable shops outside every top-50 metro radius (or lacking coordinates):** 23,354

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
| phone | 22,313 | 25,594 | 87.2% |
| website | 17,675 | 25,594 | 69.1% |
| hours | 3,147 | 25,594 | 12.3% |
| description | 2 | 25,594 | 0.0% |
| cover_image_url | 3,493 | 25,594 | 13.6% |
| specialties (N/A — column exists only on artists) | 0 | 25,594 | 0.0% |
