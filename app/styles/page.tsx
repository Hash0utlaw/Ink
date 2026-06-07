import { Suspense } from "react"
import Link from "next/link"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { MotionView } from "@/components/utils/motion-view"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"

export const metadata = {
  title: "Tattoo Styles | Ink",
  description:
    "Explore the full spectrum of tattoo styles — from fine line and realism to Japanese, blackwork, watercolor, and beyond. Find artists and shops for every style.",
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

// Group styles by category
const CATEGORIES = Array.from(new Set(ALL_STYLES.map((s) => s.category)))

export default function AllStylesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main className="flex-1 bg-background">
        {/* ── Hero ── */}
        <div className="border-b border-border bg-muted/30">
          <div className="container mx-auto px-4 py-14 md:py-20 text-center">
            <MotionView>
              <Badge variant="outline" className="mb-4 text-xs font-medium tracking-wider uppercase">
                Style Guide
              </Badge>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-balance">
                Every Tattoo Style,<br className="hidden sm:block" /> All in One Place
              </h1>
              <p className="mt-5 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
                Browse {ALL_STYLES.length} distinct styles — from fine line and realism to Japanese, blackwork, and
                watercolor. Click any style to see examples and find artists or shops near you.
              </p>
            </MotionView>
          </div>
        </div>

        {/* ── Styles grouped by category ── */}
        <div className="container mx-auto px-4 py-12 space-y-16">
          {CATEGORIES.map((category) => {
            const categoryStyles = ALL_STYLES.filter((s) => s.category === category)
            return (
              <section key={category}>
                <MotionView>
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-bold">{category}</h2>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {categoryStyles.length} style{categoryStyles.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </MotionView>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryStyles.map((style, i) => (
                    <MotionView key={style.slug} delay={i * 0.07}>
                      <Link href={`/styles/${style.slug}`} className="group block">
                        <div className="relative overflow-hidden rounded-xl aspect-[4/3] shadow-sm hover:shadow-xl transition-all duration-300 border border-border/60">
                          {/* Hero image */}
                          <img
                            src={style.heroImage}
                            alt={`${style.name} tattoo style`}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                          {/* Tags top-left */}
                          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                            {style.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="bg-black/50 backdrop-blur-sm text-white/90 text-[10px] font-medium px-2 py-0.5 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* Arrow top-right */}
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="bg-primary rounded-full p-1.5">
                              <ArrowRight className="w-3.5 h-3.5 text-primary-foreground" />
                            </div>
                          </div>

                          {/* Text bottom */}
                          <div className="absolute bottom-0 left-0 right-0 p-5">
                            <h3 className="font-bold text-white text-xl mb-1 group-hover:text-primary/90 transition-colors">
                              {style.name}
                            </h3>
                            <p className="text-white/70 text-xs leading-relaxed line-clamp-2">{style.description}</p>
                          </div>
                        </div>
                      </Link>
                    </MotionView>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        {/* ── Bottom CTA ── */}
        <div className="border-t border-border bg-muted/30">
          <div className="container mx-auto px-4 py-14 text-center">
            <MotionView>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Not sure which style suits you?</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Browse artists and shops to get inspired, or use our AI design generator to explore ideas.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link
                  href="/artists"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-medium px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Browse Artists <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/shops"
                  className="inline-flex items-center gap-2 border border-border bg-background text-foreground font-medium px-6 py-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  Browse Shops <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </MotionView>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
