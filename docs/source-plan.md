# Source Plan — Nationwide Shop Coverage (Task 4)

This is analysis only. **No scraper is built and no data is imported as part
of this document** — per the original instruction, nothing further gets
built until you pick an approach from what's below.

Grounded in `data/coverage-report.md` (generated this session): `shops` has
25,594 rows, 3,876 (15.1%) usable. 31 of the top-50 metros have fewer than
15 usable shops.

## 1. What we actually have working today

All of this repo's real collector code turned out to live **outside** this
repo, at `~/Desktop/Claude/Claude/scraper/` — the hardcoded CSV paths in the
three importer scripts point there. That directory contains:

| File | What it does | Feeds |
|---|---|---|
| `booksy_scraper.py` | Scrapes Booksy business + artist listings | `import-booksy-shops.ts` → `shops`, `import-booksy-artists.ts` → `shop_artists` |
| `tattoodo_scraper.py` | Scrapes Tattoodo artist profiles + portfolios | `import-tattoodo-artists.ts` → `artists` only (no shops, no `shop_id` set) |
| `yelp_enrich.py` | Calls the **official Yelp Fusion API** (not scraping) for tattoo businesses/artists by city | **Nothing yet** — no importer in `Ink/scripts/` consumes its output |
| — | A **pre-scraped, never-imported dataset**: `data/inkfinder_shops.csv` (7,378 rows: name, address, city, state, zip, phone, website) | **Nothing yet** — no importer exists for this file at all |

Two things worth being direct about, since they change the whole plan:

- **Tattoodo currently contributes zero shops.** It only creates shop-less
  `artists` rows. If shop coverage is the goal, Tattoodo as currently wired
  does nothing for it.
- **"Inkfinder" is a real, already-scraped 7,378-row dataset sitting unused
  on disk** — not a mystery, not a live source. It was scraped once (files
  dated mid-June) and never imported. This is almost certainly the fastest
  lever available: zero new scraping, just a new importer script. The
  catch — see item 5 — is it has **no coordinates and no unique ID**, so it
  needs a geocoding pass and a synthesized dedup key before it's usable.

## 2. Which source closes the 31 thin/zero metros

Checked `inkfinder_shops.csv`'s state distribution directly: it's
overwhelmingly CA (2,336) / FL (2,139) / TX (1,598) / NY (1,217) — the same
four states already best-represented in `shops`. It can deepen coverage
*inside* already-strong states (e.g. SF/San Jose/Austin/San Antonio, which
are thin despite CA/TX being strong overall), but it does **not** touch the
biggest-population gaps: Philadelphia, Phoenix, Boston, Detroit, Seattle,
Minneapolis, St. Louis, etc. None of those states appear in this dataset in
meaningful volume.

For those metros, the realistic options are:
- **Booksy scraper, re-run targeted at those states** — `booksy_scraper.py`
  already works and is state-agnostic (it discovers businesses by
  city/region). Rate limit is a fixed `RATE_DELAY = 1.5s` between requests
  with retry/backoff on rate-limiting — so cost scales linearly and
  predictably. At ~1.5s/request, a metro-sized haul (roughly a few hundred
  to ~1,000 requests per metro, based on the ~380-row Booksy CSV we already
  have covering a modest slice of the country) is realistically a
  **few hours of unattended runtime per metro**, not a multi-day effort —
  but see the ToS note in item 3 before treating that as a green light.
- **Yelp Fusion API (`yelp_enrich.py`)** — already built, already
  city/state-targeted (`--states TX,CA,FL,NY,NC` style CLI), and unlike the
  two scrapers this is an **official, sanctioned API**, not scraping. Free
  tier is 500 calls/day, which is the real constraint — filling a single
  thin metro (a few hundred businesses) is feasible in a day or two of
  polling; doing all 31 at once is not, without a paid Yelp tier.

## 3. ToS considerations — stated plainly, not hedged

- **Booksy**: `booksy.com/robots.txt` disallows `/search/` and `/api/`
  entirely, and multiple query-string search patterns. I could not load
  Booksy's Terms of Use page directly (404'd), so I'm not able to quote
  explicit anti-scraping contract language — that's a real gap, not
  something I'm asserting cleared. What I *can* confirm: third-party
  commercial scraping tools for Booksy exist (Apify listings, GitHub
  projects), and at least one of those repos explicitly describes needing
  **proxy rotation to defeat Booksy's active anti-scraping measures** —
  meaning Booksy is documented to actively resist this, technically, even
  where I can't quote a contract clause. Treat continued/expanded Booksy
  scraping as **legally unreviewed and technically adversarial** — I'd get
  an actual ToS read (by you or counsel) before scaling this up, not just
  before launch.
- **Tattoodo**: `tattoodo.com/robots.txt` is materially more permissive —
  general artist/studio pages aren't disallowed, only parameterized search
  results and a handful of functional paths, and they publish a
  `sitemap.xml`. This doesn't constitute a license to scrape, but it's a
  meaningfully lower-friction posture than Booksy's, both technically and
  as a signal. I did not locate explicit ToS scraping language for Tattoodo
  either — same caveat applies.
- **Yelp**: using the official Fusion API is the one source here with a
  clear, sanctioned terms-of-use path (an API key, a documented rate limit,
  presumably attribution requirements to review) — the lowest-risk option
  of the three by a wide margin.
- **Inkfinder dataset**: it's already-scraped, already sitting on disk — no
  new scraping ToS question is raised by importing it, though its original
  provenance (what site it was scraped from) isn't labeled in the file
  itself and is worth confirming before treating it as clean.

## 4. Recommended order — 10 states/metros for maximum launch impact

Ranked by population among metros currently below the 15-usable-shop
threshold (population-weighted gap, from `data/coverage-report.md`):

1. **Philadelphia** (6.3M pop, 6 usable)
2. **Phoenix** (5.2M, 4 usable)
3. **Boston** (5.0M, 3 usable)
4. **Detroit** (4.4M, 2 usable)
5. **Seattle** (4.2M, 2 usable)
6. **Minneapolis–St. Paul** (3.8M, 3 usable)
7. **St. Louis** (2.8M, **0 usable** — a true zero in a top-25 metro)
8. **Austin** (2.6M, 8 usable — also directly helped by the CA/TX-heavy
   inkfinder dataset, so pairs well with a fast first pass)
9. **Portland, OR** (2.5M, 2 usable)
10. **Pittsburgh** (2.4M, 1 usable)

Denver (3.1M, 10 usable) and Baltimore (2.9M, 14 usable) are close enough to
threshold that they're lower priority than the above.

## 5. Coordinates — does each source give us lat/lng directly?

This matters completely: per `app/api/map/route.ts`, a shop with no (or
zero) lat/lng is invisible on the map regardless of anything else.

| Source | Gives lat/lng directly? |
|---|---|
| Booksy scraper | **Yes** — `import-booksy-shops.ts`'s `buildRecord()` reads `row.lat`/`row.lng` straight from the CSV, no extra step needed. |
| Tattoodo scraper | N/A for shops (doesn't create shop rows at all). |
| Yelp Fusion API | **Yes** — the API returns coordinates per business in its standard response; `yelp_enrich.py` would need to be checked/extended to actually capture and write them through, but the source data has them. |
| Inkfinder dataset | **No** — `name, address, city, state, zip, phone, website` only. This is the one real blocker on treating it as a quick win: every row needs a geocoding pass (address → lat/lng) before it can pass the USABLE definition, which means picking and paying for a geocoding API and writing that step — not free, but likely still cheaper than net-new scraping for ~7,378 rows already collected. |

## Bottom line

No scraper gets built or run from this analysis. Three real options exist,
each with a different cost/speed/risk shape:

- **Fastest, no new scraping**: write an importer for `inkfinder_shops.csv`
  + a geocoding step. Helps CA/FL/TX/NY depth (including Austin, SF, San
  Jose, San Antonio) but not the biggest-population gaps.
- **Lowest legal risk**: extend `yelp_enrich.py` to actually populate
  `shops` (it currently doesn't feed any importer), gated by the 500
  calls/day free-tier ceiling.
- **Broadest reach, most exposure**: re-run `booksy_scraper.py` targeted at
  the 10 metros above — works, is state-agnostic, gives coordinates for
  free, but carries the unresolved Booksy ToS/anti-scraping question above.

Tell me which of these (or what combination) to build toward, and I'll plan
the actual collector/importer work as its own pass.
