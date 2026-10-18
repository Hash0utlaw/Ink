# Artists with no shop: plan and build (Step 6)

Part 1 was the research and plan. Part 2 builds it, following design Round 11.
TattoosWizard has no "private" label: only 37 of the 1,101 say "private studio",
and only in machine-written text. So imported rows are shown as
**"Studio not listed"**, and `is_private_studio` is false for every one of them.
Only a claimed artist can choose "Private studio" (claim form or dashboard).
The migration is applied only after approval.

## The artists

TattoosWizard lists 1,514 US artists who work privately. Step 1's matcher
(`scripts/tw/match.ts`) gave them the status `artist_new_private`. That means
the page is an artist page, not a studio page, and:
- it matched none of our artists (by Instagram, or by name + city + state),
- their own Instagram, phone and website matched none of our shops,
- and it names no studio, on the page or in the bio.

`scripts/by-appointment/inventory.ts` describes them using only the Step 1
cache. The inventory is in `data/reports/by-appointment-inventory.md`.

What the cache has for these artists:
- **Name, city, state, Instagram, styles and followers:** nearly 100%.
- **Email:** 61%. **Phone:** 25%. **Website:** 54%.
- **ZIP:** 1%, and only inside street addresses.
- **TikTok:** 1 artist.

TattoosWizard's own lat/lng is **not** a reliable city center. In 174 cities,
artists have different points, 783 points are unique to one artist, and 116
pages show a street or a named place. None of that location data is used.

## Why a private artist is invisible today

Every public way to find an artist by place reaches the place through
`artists.shop_id → shops.latitude/longitude`:

| Where | What it assumes |
|---|---|
| `finder_artists_near` | `join shops s on s.id = a.shop_id`; distance, the radius box and the "shops" object all come from the shop. |
| `finder_style_counts_near` | The same inner join, so private artists aren't in the style counts either. |
| `search_artists_near` (`getArtistsNearMe`) | The same inner join. |
| `/api/map/pins` and `lib/map-data.ts` (`artistQuery`, `artistRowToMapLocation`) | `shops!inner(latitude, longitude)`; no shop means no pin, and the pin address is the shop's. |
| `lookupPlace` / `nearLabel` (finder) | City centers and "Near X" labels come from shops. That's fine: private artists only need to be found, not used as reference points. |
| Artist page `app/artists/[id]` | Loads the "Where to find" panel and "Also at this shop" from `shopId`. With no shop, both are simply left out. |
| `ArtistHeader` | "at {shop}" line, Where to find map panel, directions. |
| `profile-sections.tsx` empty state | "Ask the shop for recent work." |
| Request an intro (`/api/bookings`, `lib/intro-outreach.ts`, `lib/request-copy.ts`) | Outreach goes to the shop's phone, email or website, and the copy says "We'll pass your request on to {shop}". There's already a no-shop wording ("We'll try to reach {name}"), but the admin alert has nobody to contact except Instagram. |
| Finder result card | "at {shopName}" line. |

`/artists` (list and search by city or state) already includes artists with no
shop, because it filters on `artists.city`. ZIP search uses `shops!inner` and
leaves them out.

The database also has 73 active artists with no shop today. They're invisible
for the same reason.

## Options

**a) An artist-level city point (recommended).** Add
`is_private_studio boolean` (a label only the artist sets), plus `area_latitude numeric(5,2)` and
`area_longitude numeric(6,2)`, to `artists`. The finder, style counts and
near search take shop artists as before, plus artists who have no shop,
a city point.
- Pros:
  - One row per artist.
  - Privacy is enforced by the column types: 2 decimals is about 1 km, and the
    API can't store anything finer.
  - The shop always wins. If the artist joins a shop later, they're found at
    the shop.
  - Zero change in behavior until rows are flagged.
  - Works for the 73 existing artists with no shop too.
- Cons:
  - The finder, the pins route and a few UI spots need to understand "no shop".
  - The three functions grow a second branch (written, and tested in PGlite).

**b) One "Private studio" shop row per artist.** No finder changes.
- Cons:
  - 1,100 fake shops would pollute shop counts, `/shops`, the sitemap, the map
    shop layer, "Shops near you", reviews and claims.
  - The merge and dedupe scripts would merge every "Private studio" in a city
    (same name, same address), and coverage audits would count them.
  - The shop's address field invites someone to fill in a real address later.

**c) A separate `artist_locations` table** (artist, city, state, point, kind:
by appointment / guest spot / traveling). This is the better long-term model
if guest spots become a feature, since one artist can have several cities.
- Cons today:
  - Another join in every finder query and in the pins route.
  - Two places to keep in sync for one location.
  - Nothing in the data needs more than one city yet.
- Option (a) can move into this table later without changing what's shown.

## Privacy check (holds for the recommended design)

- **No address columns.** No street, ZIP or exact point is stored. Every
  `artists` column is public (RLS `is_active = true` and `to_jsonb(a)` in the
  finder), so the migration adds nothing finer than a city.
- **The point is the city center from our own active shops,** the same average
  `/find-artist` uses when you type "City, ST", rounded to 2 decimals. It's
  computed without any of the artist's data, so it can't reveal more than the
  city the artist already publishes.
- **The column types make it permanent.** `numeric(5,2)` / `numeric(6,2)`
  round on write, so a claimed artist editing their own row can't store an
  exact point. The import also checks every record before writing.
- **Extra safeguard:** if a page also shows a street address and our city
  center lands within 0.5 mi of that page's point, the artist is held for
  review instead of pinned (18 artists).
- **Not imported:** email and phone (personal) and TattoosWizard-hosted photos.
- **Map:** many artists share one city point, so the map's existing spread
  (small circle at zoom ≥ 14) fans them around the center. The UI change
  below caps the zoom for these pins and labels them "by appointment, city
  area", so the circle never reads as a house.

## Duplicates

These are checked against the database now, not the Step 1 snapshot:
- **Same Instagram as an active artist:** 98, all on a shop. They stay where
  they are, and nothing is written.
- **Same Instagram as an active shop:** 27 (the artist is the shop). Skipped.
- **Same Instagram as a hidden artist:** 1. Skipped, because they were hidden
  on purpose.
- **Same name + city as an active artist:** 1 (on a shop). Skipped.
- **Two private pages with one Instagram:** the most-followed is kept.

## UI changes (to mock first; none built)

| Spot | Change |
|---|---|
| Finder results card | Replace "at {shop}" with "By appointment"; city line unchanged; distance reads "≈ 3 mi" (to the city center). |
| Map pin | Distinct by-appointment marker at the city center, max zoom capped (about 12), popup says "By appointment · {City}, ST" with no address or directions. |
| Map details / sidebar card | "By appointment" instead of the shop name and address. |
| Artist page header | "By appointment · {City}, ST" in place of "at {shop}"; no Where to find panel and no directions; Instagram and website stay. |
| Contact / Request an intro | Same form; copy "We'll try to reach {name} through Instagram and email you if they pick it up"; admin alert lists Instagram, website and booking link (no shop contact). |
| Claim prompt | "Work by appointment? Claim this page to add your work and take requests directly." Claiming keeps the city point and never asks for an address. |
| Empty portfolio state | "Ask the artist for recent work" instead of "Ask the shop". |
| Finder filter (optional) | A "By appointment" chip or toggle next to the style chips. |

App code that would change along with the UI (not built):
- `rowToArtist`: read `area_latitude`/`area_longitude` and `is_private_studio`.
- `/api/map/pins` and `lib/map-data.ts`: a second query for by-appointment artists.
- `lib/request-copy.ts` and `lib/intro-outreach.ts`: the no-shop copy and contacts.

## Rollout (needs approval at each step)

1. Apply `supabase/migrations/20261018120000_by_appointment_artists.sql`.
   Nothing changes on the site.
2. Ship the UI changes above.
3. Run `scripts/by-appointment/import.ts --apply`. Undo with
   `scripts/by-appointment/undo-import.ts`, which hides the rows and never
   deletes them.
4. Review the 258 held artists. For the 49 cities with none of our shops, take
   centers from the Census Gazetteer.
5. Optionally give the 73 existing artists with no shop a city point.
