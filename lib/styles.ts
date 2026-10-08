// The one master list of tattoo styles. Everything that shows, filters on or
// stores a style uses these slugs: artists.styles, shop_styles.style, URL
// params, filters and chips. scripts/normalize-styles.ts maps free-text
// artists.specialties onto them with matchStyleSlugs() below.

export interface StyleDef {
  slug: string
  label: string
  /** Free-text variants that mean this style (matched after normalizeStyleText). */
  synonyms: string[]
}

export const STYLES = [
  { slug: "traditional", label: "Traditional", synonyms: ["american traditional", "traditional american", "americana", "old school", "oldschool", "classic american", "sailor jerry", "trad"] },
  { slug: "neo-traditional", label: "Neo-Traditional", synonyms: ["neo traditional", "neotraditional", "neo trad", "neotrad", "new traditional"] },
  { slug: "japanese", label: "Japanese", synonyms: ["japanese traditional", "traditional japanese", "neo japanese", "irezumi", "tebori"] },
  { slug: "realism", label: "Realism", synonyms: ["realistic", "micro realism", "microrealism", "photo realism", "photorealism", "photorealistic", "hyper realism", "hyperrealism", "hyperrealistic"] },
  { slug: "black-and-grey", label: "Black & Grey", synonyms: ["black and grey", "black grey", "blackandgrey", "b and g", "bng", "black and greyscale", "greyscale", "grey wash", "greywash"] },
  { slug: "fine-line", label: "Fine Line", synonyms: ["fine line", "fineline", "minimalist", "minimalism", "minimal", "single needle", "singleneedle"] },
  { slug: "blackwork", label: "Blackwork", synonyms: ["black work", "blackout"] },
  { slug: "illustrative", label: "Illustrative", synonyms: ["illustration", "sketch", "sketchy", "etching", "engraving", "woodcut"] },
  { slug: "watercolor", label: "Watercolor", synonyms: ["water color"] },
  { slug: "geometric", label: "Geometric", synonyms: ["geometry", "sacred geometry"] },
  { slug: "dotwork", label: "Dotwork", synonyms: ["dot work", "stippling", "stipple", "pointillism"] },
  { slug: "ornamental", label: "Ornamental", synonyms: ["mandala", "filigree"] },
  { slug: "tribal", label: "Tribal", synonyms: ["polynesian", "maori", "samoan", "neo tribal"] },
  { slug: "lettering", label: "Lettering & Script", synonyms: ["lettering", "script", "calligraphy", "typography", "letter"] },
  { slug: "new-school", label: "New School", synonyms: ["new school", "newschool"] },
  { slug: "anime", label: "Anime & Pop Culture", synonyms: ["anime", "manga", "pop culture"] },
  { slug: "portrait", label: "Portraits", synonyms: ["portrait", "portraiture"] },
  { slug: "floral", label: "Floral", synonyms: ["flower", "botanical"] },
  { slug: "chicano", label: "Chicano", synonyms: [] },
  { slug: "color", label: "Color", synonyms: ["full color", "color work", "colorwork", "colour"] },
  { slug: "cover-ups", label: "Cover-Ups", synonyms: ["cover up", "coverup", "cover", "rework", "blast over", "blastover"] },
] as const satisfies readonly StyleDef[]

export type StyleSlug = (typeof STYLES)[number]["slug"]

/** The first eight styles, for chips and quick filters. */
export const POPULAR_STYLES = STYLES.slice(0, 8)

const BY_SLUG = new Map<string, (typeof STYLES)[number]>(STYLES.map((s) => [s.slug, s]))
const ORDER = new Map<string, number>(STYLES.map((s, i) => [s.slug, i]))

export function isStyleSlug(x: unknown): x is StyleSlug {
  return typeof x === "string" && BY_SLUG.has(x)
}

/** Display label for a slug, or null if it isn't a known style. */
export function styleLabel(slug: string): string | null {
  return BY_SLUG.get(slug)?.label ?? null
}

/** Unique known slugs, in STYLES order. Unknown values are dropped. */
export function sortStyleSlugs(slugs: Iterable<string>): StyleSlug[] {
  return Array.from(new Set(slugs))
    .filter(isStyleSlug)
    .sort((a, b) => ORDER.get(a)! - ORDER.get(b)!)
}

// Words that end in "s" but aren't plurals.
const NOT_PLURAL = /(ss|us|is)$/

/**
 * Lowercase, trim, "&" → "and", gray → grey, colour → color, punctuation → space,
 * and plural words made singular ("Black & Gray Portraits" → "black and grey portrait").
 */
export function normalizeStyleText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/gray/g, "grey")
    .replace(/colour/g, "color")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("s") && !NOT_PLURAL.test(w) ? w.slice(0, -1) : w))
    .join(" ")
}

// Every phrase that names a style (slug, label and synonyms), normalized and
// tokenized, longest first so "neo traditional" wins over "traditional".
const PHRASES: { tokens: string[]; slug: StyleSlug }[] = STYLES.flatMap((s) =>
  Array.from(new Set([s.slug.replace(/-/g, " "), s.label, ...s.synonyms].map(normalizeStyleText)))
    .filter(Boolean)
    .map((p) => ({ tokens: p.split(" "), slug: s.slug as StyleSlug }))
).sort((a, b) => b.tokens.length - a.tokens.length)

/**
 * Rule-based match of one free-text value to canonical slugs. Whole-word
 * phrases only; each word is used by at most one phrase, longest phrase first.
 * "Black and Gray Realism" → ["realism", "black-and-grey"]. Empty if nothing matches.
 */
export function matchStyleSlugs(raw: string): StyleSlug[] {
  const words = normalizeStyleText(raw).split(" ").filter(Boolean)
  if (words.length === 0) return []
  const used = new Array<boolean>(words.length).fill(false)
  const found: StyleSlug[] = []
  for (const { tokens, slug } of PHRASES) {
    for (let i = 0; i + tokens.length <= words.length; i++) {
      let hit = true
      for (let j = 0; j < tokens.length; j++) {
        if (used[i + j] || words[i + j] !== tokens[j]) {
          hit = false
          break
        }
      }
      if (!hit) continue
      for (let j = 0; j < tokens.length; j++) used[i + j] = true
      found.push(slug)
    }
  }
  return sortStyleSlugs(found)
}

/**
 * Turns style values from a URL or form (slugs, or old-style names like
 * "Fine Line" / "Black & Grey") into canonical slugs.
 */
export function toStyleSlugs(values: string[]): StyleSlug[] {
  return sortStyleSlugs(values.flatMap((v) => (isStyleSlug(v) ? [v] : matchStyleSlugs(v))))
}

/** Labels for an artist's styles, in STYLES order; unknown slugs are skipped. */
export function styleLabels(slugs: readonly string[] | null | undefined): string[] {
  return sortStyleSlugs(slugs ?? []).map((s) => BY_SLUG.get(s)!.label)
}

/** Same set and order as styleLabels(), with each label's slug (for style chips). */
export function styleEntries(slugs: readonly string[] | null | undefined): { slug: StyleSlug; label: string }[] {
  return sortStyleSlugs(slugs ?? []).map((slug) => ({ slug, label: BY_SLUG.get(slug)!.label }))
}
