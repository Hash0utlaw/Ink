---
name: tattoomaps-design
description: The TattooMaps visual design system ("The flash chart"). Read before any UI, styling, Tailwind, CSS, component, page, email-template or image work in this repo, and before reviewing UI changes. Covers colors, fonts, spacing, component recipes, style symbols, map styling and what to avoid.
---

# TattooMaps design system: The flash chart

A sea chart drawn the way a tattooer draws flash: heavy black line, a few flat colors.
The chart is the one loud thing on each page. Everything people read and tap stays plain and calm.

Audience is everyone looking for a tattoo, not one scene. It must read as trustworthy and
professional first, themed second.

## The rules that matter most

1. **One bold element per page.** The flash chart (hero, map, or location map) is it.
   Everything else is quiet: paper background, ink text, plain lists.
2. **Color is an accent, not a fill.** Roughly 60% paper, 25% night, 15% flash colors.
   **Navy is accent only** (map water, the navy style symbols, links, focus ring), never a large surface.
   Flash red, yellow and green appear in small amounts: buttons, pins, symbols, the X.
3. **One component set.** Same button, input, chip, plate, list row, header and footer
   everywhere. Don't invent a variant for one page.
4. **Ink outlines, flat fills.** Controls and frames have solid ink borders. No gradients,
   glows, blur, glassmorphism or soft drop shadows.
5. **Change styling through tokens.** Use the CSS variables and Tailwind names below.
   Never write a raw hex value in a component.
6. **Don't change component logic, data fetching or props** when restyling.

## Color tokens

| Token (CSS var) | Tailwind | Hex | HSL | Use |
|---|---|---|---|---|
| `--paper` | `paper` | #EFE4CC | 41 52% 87% | Page background |
| `--vellum` | `vellum` | #FBF6EA | 42 68% 95% | Cards, inputs' surround, popovers, list highlight |
| `--ink` | `ink` | #221A14 | 26 26% 11% | Text, every outline |
| `--ink-muted` | `ink-muted` | #5E5045 | 26 15% 32% | Secondary text, captions |
| `--rule` | `rule` | #B9AC93 | 39 21% 65% | Hairline dividers between list rows |
| `--night` | `night` | #1A1512 | 22.5 18.2% 8.6% | Warm black: header, mobile menu, footer, dark bands, hero sea |
| `--navy` | `navy` | #1F3350 | 216 44% 22% | Accent only: map water, rivers, navy style symbols, links, focus ring. Never a large surface |
| `--cream` | `cream` | #F6EEDC | 42 59% 91% | Text and logos on night |
| `--flash-red` | `flash-red` | #B3261E | 3 71% 41% | Primary button, X mark, selected pin, errors |
| `--flash-yellow` | `flash-yellow` | #D9A426 | 42 70% 50% | Cluster seals, compass, small highlights (never text) |
| `--bottle-green` | `bottle-green` | #2F6B4F | 152 39% 30% | Style symbols, success states |
| `--chart-land` | `chart-land` | #D9C7A0 | 41 43% 74% | Banner tails, map details only |

White (#FFFFFF) is only for text on flash red and for input fields.

### shadcn/ui variable mapping (light only; no dark theme at launch)

```
--background: 41 52% 87%;        /* paper */
--foreground: 26 26% 11%;        /* ink */
--card: 42 68% 95%;              /* vellum */
--card-foreground: 26 26% 11%;
--popover: 42 68% 95%;
--popover-foreground: 26 26% 11%;
--primary: 3 71% 41%;            /* flash red */
--primary-foreground: 0 0% 100%;
--secondary: 41 45% 82%;        /* muted paper; header/footer use .tex-night directly */
--secondary-foreground: 26 26% 11%;
--muted: 41 45% 82%;             /* slightly darker paper */
--muted-foreground: 26 15% 32%;  /* ink-muted */
--accent: 41 45% 82%;            /* hover background for ghost/menu items */
--accent-foreground: 26 26% 11%;
--destructive: 3 71% 41%;
--destructive-foreground: 0 0% 100%;
--border: 39 21% 65%;            /* rule: hairlines */
--input: 26 26% 11%;             /* ink: input and control outlines */
--ring: 216 44% 22%;             /* navy focus ring */
--radius: 0.25rem;               /* 4px */
--success: 152 39% 30%;          /* bottle green */
--success-foreground: 0 0% 100%;
--warning: 42 70% 50%;           /* flash yellow */
--warning-foreground: 26 26% 11%;
```

Contrast (checked): ink on paper 13.6:1, ink-muted on paper 6.1:1, white on flash red 6.5:1,
cream on night 15.7:1, cream on navy 11:1, ink on flash yellow 7.6:1. Never put text on yellow or green except ink.

## Textures

Surfaces are textured with two 256px grain tiles in `public/brand/textures/` (do not regenerate them).
Use these classes from `app/globals.css` instead of the flat `bg-*` color for the same surface:

| Class | What it is | Use |
|---|---|---|
| `.tex-paper` | paper + `paper-grain.png` + ink chart grid (1px, 7%, every 96px) | Body and page backgrounds, map sidebar, full-screen drawers |
| `.tex-vellum` | vellum + `paper-grain.png` | Cards, panels, secondary buttons, chips, popover-like boxes |
| `.tex-night` | night + `ink-grain.png` | Header, mobile menu, footer, dark panels, the homepage hero and claim band |
| `.tex-night-chart` | night + `ink-grain.png` + cream grid (1px, 9%, every 64px) | Profile and style cover strips, the coming-soon band. Never on the homepage (the skyline hero is its one bold element) |

Always pair a texture class with its flat color utility: `bg-paper tex-paper`, `bg-vellum tex-vellum`,
`bg-night tex-night`, `bg-night tex-night-chart`. The texture classes sit in the components layer and only
add grain on top; the paired `bg-*` utility lets tailwind-merge drop a component's base background (e.g. the
Sheet's `bg-background`), and `hover:bg-*` / `data-[state=active]:bg-*` still override the color. Keep flat `bg-vellum` on tiny parts: avatar fallbacks, pins, small swatches.
Hairline repeating grids are the only gradients allowed.

## Type

| Role | Font | Tailwind | Notes |
|---|---|---|---|
| Headings, names, numbers in heroes | Young Serif 400 | `font-heading` | Only weight 400. Never bold or italic. |
| Place names only (cities, neighborhoods, coordinates) | IM Fell English italic | `font-place` | Like ports labeled on a chart. Not for anything else. |
| Everything else (body, UI, buttons, labels) | Libre Franklin 400/500/600/700 | `font-sans` | |

Scale (px): 13 caption, 14 small, 15 UI, 16 body, 19 lead, 22 card title, 26 / 30 / 34 section
heading, 44–56 page title. Line height 1.55 for body, 1.05–1.2 for headings.
`text-wrap: balance` on headings, `pretty` on paragraphs. `tabular-nums` on counts, pins, prices.

## Shape, line and spacing

- Radius: 4px on every control and card. 0 on plates and the chart frame. Circles only for pins.
- Lines: 1.5px ink on controls, chips and plates; 2px ink on primary containers (search box,
  selected-pin card); 1px `rule` for dividers between list rows; 3px ink under header/above footer.
- Shadows: none. Depth comes from outlines.
- Spacing on a 4px grid. Section gaps 72–88px desktop, 40–56px mobile. Page max width 1344px
  with 24px side padding. Text columns under 75 characters.
- Tap targets at least 44×44px.

## Component recipes

**Header**: `.tex-night` background, 3px ink bottom border, cream wordmark (`/brand/logo-wordmark-cream.webp`, 40–48px tall),
cream nav links, "For artists" as an outline button in cream. On mobile: back chevron, logo, menu icon.
The mobile menu sheet is `.tex-night` too, with the cream wordmark and cream links.

**Footer**: `.tex-night` dark bar, 3px ink top border, cream text, cream wordmark, link columns, Overture attribution.

**Primary button**: flash red fill, white text, 1.5px ink border, 4px radius, 600 weight, min-height 44px.
One primary button per view area (Search, Request an intro, Claim your page).

**Secondary button**: `.tex-vellum` fill, ink text, 1.5px ink border. **Text link**: navy, underlined, 600 weight.
No arrows (→) in button or link text.

**Input / select**: white fill, 1.5px ink border, 4px radius, min-height 44–52px, visible label above.

**Chip (filters, style tags)**: `.tex-vellum` fill, 1.5px ink border, 4px radius, 14px text, optional style symbol.
Active chip: ink fill, vellum text. Not pill-shaped.

**Plate (artist photo frame)**: 4:5, 1.5px ink outer border, 5px paper gap, 1px ink inner border.
With a photo: the photo fills the inner frame. Without a photo: vellum fill, artist initials in
Young Serif, and a 5px bottom edge in the artist's main style color (ink if the style has no color).
Never repeat the logo as a placeholder on lists. The compass mark is only the single-profile default.

**List row (shops, artists)**: no box. Name in Young Serif 21px, address 15px, rating line in
ink-muted, style symbols. Rows divided by 1px rule. Selected row: vellum fill + 1.5px ink border.

**Card for a selected map pin**: vellum, 2px ink border, red pin, name, address, rating, two text links.
Docked bottom-left of the map, not a floating bubble.

**Empty states**: one vellum box with a bold first line and one helpful sentence. No dashed placeholder grids.

## Signature pieces (the bold element)

- **Flash chart**: night sea with faint cream wave strokes, paper land with a 3–3.5px ink coastline
  and a faint offset second line, rivers as ink-cased navy lines, roads as ink-cased vellum lines,
  place names in IM Fell italic, a red X with ink outline, compass rose (yellow and red points,
  ink outline). No cartoon islands, no dotted treasure paths.
- **Neatline frame**: the striped chart border (alternating 24px ink / paper bars). Only around the chart,
  once per page.
- **Banner**: vellum ribbon with folded chart-land tails, ink outline, place name in Young Serif. Only inside the chart.
- **Pins**: 34–36px circles, 2px ink border, number in Libre Franklin 700. Default vellum, selected flash red
  with white number. Clusters: 46px flash-yellow seal with a double ring. Pin numbers always match the list.
- **Scale bar and zoom controls**: vellum box, ink border, 4px radius.

## Style symbols (all 21 styles)

Every style keeps the same symbol everywhere: chips, cards, lists, pins and filters.
Shape plus fill, so they read in black and white. Symbols are 12–16px inline, 64px on style cards.

| Style slug | Shape | Fill | Plate edge |
|---|---|---|---|
| black-and-grey | circle | half ink / half vellum | ink |
| realism | square | ink | ink |
| traditional | diamond | flash red | flash red |
| fine-line | circle | outline only | ink |
| illustrative | triangle | flash yellow | flash yellow |
| color | circle | flash yellow, red center dot | flash red |
| neo-traditional | diamond | bottle green | bottle green |
| blackwork | circle | ink | ink |
| floral | triangle | bottle green | bottle green |
| japanese | circle | navy | navy |
| portrait | square | navy | navy |
| anime | triangle | flash red | flash red |
| cover-ups | square | outline only | ink |
| geometric | triangle | outline only | ink |
| lettering | triangle | ink | ink |
| ornamental | diamond | flash yellow | flash yellow |
| new-school | circle | flash red | flash red |
| tribal | diamond | ink | ink |
| watercolor | triangle | navy | navy |
| dotwork | circle | outline with center dot | ink |
| chicano | diamond | navy | navy |

Filled shapes get a 1.5px ink outline (except solid ink ones).

## Map (Mapbox)

Land paper, water navy, major roads ink-cased vellum (8px ink / 4px vellum), minor roads ink at 50%,
neighborhood labels IM Fell italic in ink, no POI icons, no 3D buildings. Pins and clusters as above.
Keep Mapbox and OpenStreetMap attribution visible.

## Logos (public/brand/)

- Night backgrounds: `logo-wordmark-cream`. Paper backgrounds: `logo-wordmark-ink`. Big moments: `logo-wordmark-color`.
- Single-profile default photo: `compass-color`. Default profile banner: `banner-color`.
- Never recolor, stretch or add effects. Minimum wordmark height 40px; below that use the compass.

## Writing in the interface

Sentence case. Plain verbs that say what happens ("Request an intro", "Claim your page", "Search").
The same action keeps the same name across the flow. Empty states say what to do next.

## Avoid (these make it look generic or AI-made)

- Gradients, glows, blur, glassmorphism, soft drop shadows, floating blobs, hover-scale on cards.
- All-caps eyebrow labels, "·" separators in UI strings, monospace labels, → arrows on links.
- Big-number stat cards with icons. Show stats as plain text.
- Identical rounded cards for everything. Use plates, list rows and plain sections.
- Purple (#7C3AED) or any color outside the tokens.
- More than one striped frame, chart or banner per page.
- Fade-and-slide animations on every section. Motion only in response to user actions.
- The Sailor Jerry name or Norman Collins' designs.

## Design check

`npm run check:design` (scripts/check-design.ts) scans `app/`, `components/`, `lib/` and
`middleware.ts` and fails on any of these. It ignores comments. The GitHub Action
`.github/workflows/design-check.yml` runs it on every pull request.

| Rule | Fails on | Allowed |
|---|---|---|
| hex | Raw hex colors | `lib/brand-colors.ts`, `app/globals.css` |
| palette | Tailwind default palette classes (`gray-500`, `purple-600`, `bg-black`, `text-white`, ...) | `text-white` on flash red; `bg-white` on inputs |
| shadow | `shadow-*`, `drop-shadow-*`, box/text shadows | `shadow-none`; the cluster seal's double ring; the map controls' focus ring |
| radius | `rounded-lg` and larger, `rounded-full`, arbitrary radii over 4px | `rounded-full` on pins, avatars, spinners, loading skeletons, slider and scrollbar parts, the live-review dot |
| gradient | `*-gradient(` and `bg-gradient-*` | Texture hairlines (`globals.css`), neatline stripes, share-image grid |
| font | Poppins | |
| copy | `·` separators, `→` / `←` arrows | |

Use plain `rounded` (4px) for every control and card. Exceptions live in the `ALLOW` list at the top of
the script, each with a reason. Add one only when the spec itself calls for it.

## Before finishing any UI change

- `npm run check:design` passes.
- No raw hex values or Tailwind palette colors (purple-*, green-500, etc.) added.
- Headings Young Serif, place names IM Fell italic, everything else Libre Franklin.
- Every control 4px radius with ink outline; tap targets 44px or more; visible focus ring.
- Works at 390px wide.
- `npm run build` passes with zero errors.
