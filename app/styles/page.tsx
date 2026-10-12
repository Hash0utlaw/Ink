import { Suspense } from "react"
import Link from "next/link"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { StyleCard } from "@/components/styles/style-card"
import { getArtists } from "@/lib/supabase/artists"
import { exactMasterSlug } from "@/lib/style-guide"

// Real artist counts and lists, refreshed hourly.
export const revalidate = 3600

export const metadata = {
  title: "Tattoo Styles Guide — Every Style Explained | TattooMaps",
  description:
    "Explore the full spectrum of tattoo styles — from fine line and realism to Japanese, blackwork, watercolor, and beyond. Find artists and shops for every style on TattooMaps.",
}

// ─── All tattoo styles ────────────────────────────────────────────────────────

export const ALL_STYLES = [
  // ── Realistic ──
  {
    name: "Realism",
    slug: "realism",
    category: "Realistic",
    description: "Hyper-detailed portraits and photographic accuracy rendered in ink.",
    tags: ["Portraits", "Wildlife", "Black & Grey"],
    heroImage: "/styles/heroes/realism-hero.png",
    exampleImages: [
      "/styles/realism-portrait-1.png",
      "/styles/realism-portrait-2.png",
      "/styles/realism-portrait-3.png",
      "/styles/realism-animal-1.png",
      "/styles/realism-animal-2.png",
      "/styles/realism-eye-1.png",
      "/styles/realism-flower-1.png",
      "/styles/realism-landscape-1.png",
      "/styles/realism-nature-1.png",
    ],
  },
  {
    name: "Black & Grey",
    slug: "black-grey",
    category: "Realistic",
    description: "Monochromatic shading and gradient work that creates depth without colour.",
    tags: ["Shading", "Portraits", "Dramatic"],
    heroImage: "/styles/heroes/black-grey-hero.png",
    exampleImages: [
      "/styles/realism-portrait-2.png",
      "/styles/realism-portrait-3.png",
      "/styles/realism-eye-1.png",
      "/styles/realism-animal-1.png",
      "/styles/realism-landscape-1.png",
      "/styles/realism-flower-1.png",
    ],
  },
  // ── Classic ──
  {
    name: "Traditional",
    slug: "traditional",
    category: "Classic",
    description: "Bold outlines, limited palettes, and iconic American imagery.",
    tags: ["Bold Lines", "Classic", "American"],
    heroImage: "/styles/heroes/traditional-hero.png",
    exampleImages: [
      "/styles/traditional-rose-1.png",
      "/styles/traditional-eagle-1.png",
      "/styles/traditional-anchor-1.png",
      "/styles/traditional-skull-1.png",
      "/styles/traditional-heart-1.png",
      "/styles/traditional-swallow-1.png",
      "/styles/traditional-dagger-1.png",
      "/styles/traditional-ship-1.png",
      "/styles/traditional-pin-up-1.png",
    ],
  },
  {
    name: "Neo-Traditional",
    slug: "neo-traditional",
    category: "Classic",
    description: "A modern twist on traditional — richer colours, more detail, and illustrative depth.",
    tags: ["Illustrative", "Colour", "Bold"],
    heroImage: "/styles/heroes/neo-traditional-hero.png",
    exampleImages: [
      "/styles/traditional-eagle-1.png",
      "/styles/traditional-heart-1.png",
      "/styles/traditional-skull-1.png",
      "/styles/traditional-swallow-1.png",
      "/styles/traditional-dagger-1.png",
    ],
  },
  // ── Asian ──
  {
    name: "Japanese",
    slug: "japanese",
    category: "Asian",
    description: "Traditional Irezumi motifs — dragons, koi, cherry blossoms, and oni.",
    tags: ["Irezumi", "Dragons", "Koi"],
    heroImage: "/styles/heroes/japanese-hero.png",
    exampleImages: [
      "/styles/japanese-dragon-1.png",
      "/styles/japanese-koi-1.png",
      "/styles/japanese-wave-1.png",
      "/styles/japanese-tiger-1.png",
      "/styles/japanese-phoenix-1.png",
      "/styles/japanese-cherry-1.png",
      "/styles/japanese-lotus-1.png",
      "/styles/japanese-oni-1.png",
      "/styles/japanese-samurai-1.png",
    ],
  },
  {
    name: "Tribal",
    slug: "tribal",
    category: "Asian",
    description: "Geometric patterns rooted in Polynesian, Maori, and indigenous cultures.",
    tags: ["Polynesian", "Maori", "Cultural"],
    heroImage: "/styles/heroes/tribal-hero.png",
    exampleImages: [
      "/styles/blackwork-tribal-1.png",
      "/styles/blackwork-pattern-1.png",
      "/styles/blackwork-mandala-1.png",
      "/styles/blackwork-geometric-1.png",
      "/styles/blackwork-animal-1.png",
    ],
  },
  // ── Geometric & Abstract ──
  {
    name: "Geometric",
    slug: "geometric",
    category: "Geometric & Abstract",
    description: "Sacred geometry, precision linework, and mathematical harmony.",
    tags: ["Sacred Geometry", "Precision", "Minimal"],
    heroImage: "/styles/heroes/geometric-hero.png",
    exampleImages: [
      "/styles/geometric-mandala-1.png",
      "/styles/geometric-sacred-1.png",
      "/styles/geometric-hexagon-1.png",
      "/styles/geometric-triangle-1.png",
      "/styles/geometric-spiral-1.png",
      "/styles/geometric-crystal-1.png",
      "/styles/geometric-flower-1.png",
      "/styles/geometric-animal-1.png",
      "/styles/geometric-abstract-1.png",
    ],
  },
  {
    name: "Mandala",
    slug: "mandala",
    category: "Geometric & Abstract",
    description: "Intricate circular patterns with spiritual symbolism and perfect symmetry.",
    tags: ["Spiritual", "Symmetry", "Dotwork"],
    heroImage: "/styles/heroes/mandala-hero.png",
    exampleImages: [
      "/styles/geometric-mandala-1.png",
      "/styles/geometric-sacred-1.png",
      "/styles/geometric-spiral-1.png",
      "/styles/geometric-hexagon-1.png",
      "/styles/blackwork-mandala-1.png",
    ],
  },
  {
    name: "Dotwork",
    slug: "dotwork",
    category: "Geometric & Abstract",
    description: "Thousands of precise dots build shading, texture, and tone without solid lines.",
    tags: ["Stippling", "Detailed", "Texture"],
    heroImage: "/styles/heroes/dotwork-hero.png",
    exampleImages: [
      "/styles/geometric-sacred-1.png",
      "/styles/geometric-mandala-1.png",
      "/styles/geometric-crystal-1.png",
      "/styles/blackwork-ornamental-1.png",
      "/styles/blackwork-mandala-1.png",
    ],
  },
  // ── Blackwork ──
  {
    name: "Blackwork",
    slug: "blackwork",
    category: "Blackwork",
    description: "Bold solid black ink, dramatic contrast, and striking graphic compositions.",
    tags: ["Solid Black", "Bold", "Graphic"],
    heroImage: "/styles/heroes/blackwork-hero.png",
    exampleImages: [
      "/styles/blackwork-abstract-1.png",
      "/styles/blackwork-botanical-1.png",
      "/styles/blackwork-geometric-1.png",
      "/styles/blackwork-mandala-1.png",
      "/styles/blackwork-minimalist-1.png",
      "/styles/blackwork-ornamental-1.png",
      "/styles/blackwork-pattern-1.png",
      "/styles/blackwork-tribal-1.png",
      "/styles/blackwork-animal-1.png",
    ],
  },
  {
    name: "Ornamental",
    slug: "ornamental",
    category: "Blackwork",
    description: "Decorative flourishes, lace patterns, and jewellery-inspired motifs.",
    tags: ["Decorative", "Lace", "Jewellery"],
    heroImage: "/styles/heroes/ornamental-hero.png",
    exampleImages: [
      "/styles/blackwork-ornamental-1.png",
      "/styles/blackwork-pattern-1.png",
      "/styles/blackwork-mandala-1.png",
      "/styles/geometric-sacred-1.png",
      "/styles/geometric-flower-1.png",
    ],
  },
  // ── Fine Line & Minimal ──
  {
    name: "Fine Line",
    slug: "fine-line",
    category: "Fine Line & Minimal",
    description: "Delicate single-needle work with intricate details and elegant simplicity.",
    tags: ["Minimalist", "Delicate", "Single Needle"],
    heroImage: "/styles/heroes/fine-line-hero.png",
    exampleImages: [
      "/styles/fine-line-botanical-1.png",
      "/styles/fine-line-flower-1.png",
      "/styles/fine-line-portrait-1.png",
      "/styles/fine-line-animal-1.png",
      "/styles/fine-line-constellation-1.png",
      "/styles/fine-line-geometric-1.png",
      "/styles/fine-line-minimalist-1.png",
      "/styles/fine-line-script-1.png",
      "/styles/fine-line-abstract-1.png",
    ],
  },
  {
    name: "Minimalist",
    slug: "minimalist",
    category: "Fine Line & Minimal",
    description: "Small, clean designs with purposeful simplicity — less is more.",
    tags: ["Small", "Simple", "Clean"],
    heroImage: "/styles/heroes/minimalist-hero.png",
    exampleImages: [
      "/styles/fine-line-minimalist-1.png",
      "/styles/fine-line-geometric-1.png",
      "/styles/fine-line-constellation-1.png",
      "/styles/blackwork-minimalist-1.png",
      "/styles/fine-line-abstract-1.png",
    ],
  },
  {
    name: "Script & Lettering",
    slug: "script",
    category: "Fine Line & Minimal",
    description: "Calligraphy, typography, and handwritten text turned into body art.",
    tags: ["Typography", "Calligraphy", "Words"],
    heroImage: "/styles/heroes/script-hero.png",
    exampleImages: [
      "/styles/fine-line-script-1.png",
      "/styles/fine-line-minimalist-1.png",
      "/styles/fine-line-abstract-1.png",
    ],
  },
  // ── Colour & Painterly ──
  {
    name: "Watercolor",
    slug: "watercolor",
    category: "Colour & Painterly",
    description: "Fluid brushstroke aesthetics with vibrant colour washes and soft edges.",
    tags: ["Colour", "Painterly", "Fluid"],
    heroImage: "/styles/heroes/watercolor-hero.png",
    exampleImages: [
      "/styles/watercolor-flower-1.png",
      "/styles/watercolor-butterfly-1.png",
      "/styles/watercolor-bird-1.png",
      "/styles/watercolor-abstract-1.png",
      "/styles/watercolor-galaxy-1.png",
      "/styles/watercolor-feather-1.png",
      "/styles/watercolor-ocean-1.png",
      "/styles/watercolor-splash-1.png",
      "/styles/watercolor-tree-1.png",
    ],
  },
  {
    name: "Illustrative",
    slug: "illustrative",
    category: "Colour & Painterly",
    description: "Storybook and comic-book inspired designs with personality and narrative.",
    tags: ["Comic", "Storybook", "Narrative"],
    heroImage: "/styles/heroes/illustrative-hero.png",
    exampleImages: [
      "/styles/traditional-eagle-1.png",
      "/styles/traditional-rose-1.png",
      "/styles/watercolor-bird-1.png",
      "/styles/japanese-phoenix-1.png",
      "/styles/japanese-dragon-1.png",
    ],
  },
  // ── Specialty ──
  {
    name: "Biomechanical",
    slug: "biomechanical",
    category: "Specialty",
    description: "Sci-fi inspired designs merging human anatomy with machine components.",
    tags: ["Sci-Fi", "3D", "Dark"],
    heroImage: "/styles/heroes/biomechanical-hero.png",
    exampleImages: [
      "/styles/blackwork-abstract-1.png",
      "/styles/geometric-crystal-1.png",
      "/styles/geometric-abstract-1.png",
      "/styles/blackwork-geometric-1.png",
    ],
  },
  {
    name: "Surrealism",
    slug: "surrealism",
    category: "Specialty",
    description: "Dream-like imagery that bends reality with unexpected juxtapositions.",
    tags: ["Abstract", "Dreamlike", "Unique"],
    heroImage: "/styles/heroes/surrealism-hero.png",
    exampleImages: [
      "/styles/watercolor-galaxy-1.png",
      "/styles/watercolor-abstract-1.png",
      "/styles/fine-line-abstract-1.png",
      "/styles/geometric-abstract-1.png",
    ],
  },
  {
    name: "Botanical",
    slug: "botanical",
    category: "Specialty",
    description: "Flowers, leaves, and plants captured with scientific or artistic precision.",
    tags: ["Nature", "Floral", "Plants"],
    heroImage: "/styles/heroes/botanical-hero.png",
    exampleImages: [
      "/styles/fine-line-botanical-1.png",
      "/styles/blackwork-botanical-1.png",
      "/styles/fine-line-flower-1.png",
      "/styles/watercolor-flower-1.png",
      "/styles/watercolor-tree-1.png",
    ],
  },
]

// Same buttons as the rest of the site (docs: Primary / Secondary button).
const PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-lg border-1.5 border-ink bg-flash-red px-5 text-[15px] font-semibold text-white hover:bg-flash-red/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const SECONDARY =
  "inline-flex min-h-11 items-center justify-center rounded-lg border-1.5 border-ink bg-vellum tex-vellum px-5 text-[15px] font-semibold text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

/** Real artist counts for guide styles that exactly match a master style; null when unknown. */
async function artistCounts(): Promise<Record<string, number | null>> {
  const entries = await Promise.all(
    ALL_STYLES.map(async (style) => {
      const master = exactMasterSlug(style.slug)
      if (!master) return [style.slug, null] as const
      const { count, error } = await getArtists({ styles: [master], pageSize: 1 })
      return [style.slug, error ? null : count] as const
    }),
  )
  return Object.fromEntries(entries)
}

export default async function AllStylesPage() {
  const counts = await artistCounts()

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      {/* No entrance animation: everything is readable on first paint. */}
      <main className="flex-1 bg-paper tex-paper">
        <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 lg:py-16">
          <h1 className="font-heading text-[34px] leading-[1.1] text-ink text-balance lg:text-[52px]">
            Every tattoo style in one place
          </h1>
          <p className="mt-3 max-w-prose text-[17px] leading-[1.55] text-ink-muted text-pretty lg:text-[19px]">
            Browse {ALL_STYLES.length} styles, from fine line and realism to Japanese and blackwork, then find artists or
            shops near you.
          </p>

          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-5">
            {ALL_STYLES.map((style) => (
              <li key={style.slug}>
                <StyleCard style={style} masterSlug={exactMasterSlug(style.slug)} artistCount={counts[style.slug]} />
              </li>
            ))}
          </ul>

          <section aria-labelledby="styles-next" className="mt-16 border-t border-rule pt-10 lg:mt-20">
            <h2 id="styles-next" className="font-heading text-[26px] leading-[1.15] text-ink lg:text-[30px]">
              Not sure which style suits you?
            </h2>
            <p className="mt-2 max-w-prose text-base leading-[1.55] text-ink-muted text-pretty">
              Browse artists and shops to get inspired and find the right fit.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/artists" className={PRIMARY}>
                Browse artists
              </Link>
              <Link href="/shops" className={SECONDARY}>
                Browse shops
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
