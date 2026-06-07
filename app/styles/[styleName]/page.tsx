import { notFound } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, MapPin, User } from "lucide-react"
import { ALL_STYLES } from "@/app/styles/page"
import { StyleGallery } from "@/components/styles/style-gallery"
import { StyleRelated } from "@/components/styles/style-related"
import { StyleHero } from "@/components/styles/style-hero"

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: { styleName: string } }) {
  const style = ALL_STYLES.find((s) => s.slug === params.styleName)
  if (!style) return {}
  return {
    title: `${style.name} Tattoos | Ink`,
    description: style.description,
  }
}

export async function generateStaticParams() {
  return ALL_STYLES.map((s) => ({ styleName: s.slug }))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StylePage({ params }: { params: { styleName: string } }) {
  const style = ALL_STYLES.find((s) => s.slug === params.styleName)
  if (!style) notFound()

  const related = ALL_STYLES.filter(
    (s) => s.slug !== style.slug && s.category === style.category
  ).slice(0, 3)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <StyleHero style={style} />

        {/* ── Sticky CTA bar ───────────────────────────────────────────────── */}
        <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md shadow-sm">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground hidden sm:block">
              Ready to get your <span className="font-semibold text-foreground">{style.name}</span> tattoo?
            </p>
            <div className="flex items-center gap-2 ml-auto">
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link href={`/shops?styles=${encodeURIComponent(style.name)}`}>
                  <MapPin className="w-3.5 h-3.5" />
                  Find a Shop
                </Link>
              </Button>
              <Button asChild size="sm" className="gap-1.5">
                <Link href={`/artists?styles=${encodeURIComponent(style.name)}`}>
                  <User className="w-3.5 h-3.5" />
                  Find an Artist
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Gallery ──────────────────────────────────────────────────────── */}
        <section className="container mx-auto px-4 py-10">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">{style.name} Examples</h2>
            <p className="text-muted-foreground text-sm">
              {style.exampleImages.length} curated examples of {style.name.toLowerCase()} tattoo work
            </p>
          </div>
          <StyleGallery images={style.exampleImages} styleName={style.name} />
        </section>

        {/* ── What makes this style ─────────────────────────────────────────── */}
        <section className="container mx-auto px-4 py-6 pb-10">
          <div className="rounded-2xl bg-muted/40 border border-border p-6 md:p-8">
            <h2 className="text-xl font-bold mb-4">About {style.name}</h2>
            <p className="text-muted-foreground leading-relaxed mb-5">{style.description}</p>
            <div className="flex flex-wrap gap-2">
              {style.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* ── Primary CTA: Find Shop or Artist ─────────────────────────────── */}
        <section className="container mx-auto px-4 pb-10">
          <div className="rounded-2xl overflow-hidden border border-border">
            <div className="grid md:grid-cols-2">

              {/* Find a Shop card */}
              <Link
                href={`/shops?styles=${encodeURIComponent(style.name)}`}
                className="group relative flex flex-col gap-4 p-7 md:p-10 bg-card hover:bg-muted/30 transition-colors border-b md:border-b-0 md:border-r border-border"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">
                    Find a Shop
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Browse tattoo shops that specialise in {style.name.toLowerCase()} work. Filter by location
                    and see shop portfolios.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-primary mt-auto">
                  Browse {style.name} shops
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Find an Artist card */}
              <Link
                href={`/artists?styles=${encodeURIComponent(style.name)}`}
                className="group relative flex flex-col gap-4 p-7 md:p-10 bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">
                    Find an Artist
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Connect directly with tattoo artists who specialise in {style.name.toLowerCase()}. View
                    portfolios and book a consultation.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-primary mt-auto">
                  Browse {style.name} artists
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

            </div>
          </div>
        </section>

        {/* ── Related styles ────────────────────────────────────────────────── */}
        {related.length > 0 && (
          <section className="container mx-auto px-4 pb-14">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-xl font-bold">Related Styles</h2>
              <div className="flex-1 h-px bg-border" />
            </div>
            <StyleRelated styles={related} />
          </section>
        )}

      </main>

      <Footer />
    </div>
  )
}
