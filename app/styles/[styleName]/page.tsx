import { notFound } from "next/navigation"
import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { ShopCard, ShopCardSkeleton } from "@/components/shops/shop-card"
import { ArtistCard, ArtistCardSkeleton } from "@/components/artists/artist-card"
import { Button } from "@/components/ui/button"
import { getShops } from "@/lib/supabase/shops"
import { getArtists } from "@/lib/supabase/artists"

// ─── Style metadata ───────────────────────────────────────────────────────────

type StyleMeta = {
  displayName: string
  description: string
  heroImage: string
}

const STYLES: Record<string, StyleMeta> = {
  realism: {
    displayName: "Realism",
    description: "Lifelike portraits and hyper-realistic artwork",
    heroImage: "https://images.unsplash.com/photo-1590246814883-55516d489f2a?w=1200&q=80",
  },
  traditional: {
    displayName: "Traditional",
    description: "Bold lines and classic American imagery",
    heroImage: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1200&q=80",
  },
  geometric: {
    displayName: "Geometric",
    description: "Sacred geometry and mathematical precision",
    heroImage: "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=1200&q=80",
  },
  watercolor: {
    displayName: "Watercolor",
    description: "Fluid colors and painterly brush strokes",
    heroImage: "https://images.unsplash.com/photo-1542396601-dca920ea2807?w=1200&q=80",
  },
  japanese: {
    displayName: "Japanese",
    description: "Traditional Irezumi and oriental motifs",
    heroImage: "https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=1200&q=80",
  },
  blackwork: {
    displayName: "Blackwork",
    description: "Bold black ink, tribal and ornamental patterns",
    heroImage: "https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=1200&q=80",
  },
  "fine-line": {
    displayName: "Fine Line",
    description: "Delicate single-needle and minimalist designs",
    heroImage: "https://images.unsplash.com/photo-1604881991720-f91add269bed?w=1200&q=80",
  },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StylePage({
  params,
}: {
  params: { styleName: string }
}) {
  const meta = STYLES[params.styleName]
  if (!meta) notFound()

  const { displayName, description, heroImage } = meta

  // Fetch shops and artists filtered by this style (limit 6 each)
  const [shopsResult, artists] = await Promise.all([
    getShops({ styles: [displayName], pageSize: 6, page: 0 }),
    getArtists({ styles: [displayName] }),
  ])
  const shops = shopsResult.data.slice(0, 6)
  const topArtists = artists.slice(0, 6)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main className="flex-1">

        {/* ─── Section 1: Hero banner ─────────────────────────────────────── */}
        <div className="container mx-auto px-4 pt-8">
          <div className="relative w-full overflow-hidden rounded-xl" style={{ maxHeight: 320, aspectRatio: "21/9" }}>
            <Image
              src={heroImage}
              alt={`${displayName} tattoo style`}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 1200px"
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            {/* Text anchored bottom-left */}
            <div className="absolute bottom-0 left-0 p-6">
              <h1 className="text-4xl font-bold text-white leading-tight">{displayName}</h1>
              <p className="mt-1 text-white/80 text-base">{description}</p>
            </div>
          </div>
        </div>

        {/* ─── Section 2: Shops ───────────────────────────────────────────── */}
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-2xl font-bold">Shops specialising in {displayName}</h2>
            <Link
              href={`/shops?styles=${encodeURIComponent(displayName)}`}
              className="text-sm text-accent hover:underline underline-offset-4"
            >
              Browse all {displayName} shops
            </Link>
          </div>

          {shops.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center text-muted-foreground">
              <p>No shops listed for this style yet.</p>
              <Button asChild variant="outline">
                <Link href="/shops">Browse all shops</Link>
              </Button>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ShopCardSkeleton key={i} />
                  ))}
                </div>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {shops.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} />
                ))}
              </div>
            </Suspense>
          )}
        </section>

        {/* ─── Section 3: Artists ─────────────────────────────────────────── */}
        <section className="container mx-auto px-4 pb-12">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-2xl font-bold">Artists specialising in {displayName}</h2>
            <Link
              href={`/artists?styles=${encodeURIComponent(displayName)}`}
              className="text-sm text-accent hover:underline underline-offset-4"
            >
              Browse all {displayName} artists
            </Link>
          </div>

          {topArtists.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center text-muted-foreground">
              <p>No artists listed for this style yet.</p>
              <Button asChild variant="outline">
                <Link href="/artists">Browse all artists</Link>
              </Button>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ArtistCardSkeleton key={i} />
                  ))}
                </div>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {topArtists.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            </Suspense>
          )}
        </section>

        {/* ─── Section 4: Bottom CTA ──────────────────────────────────────── */}
        <section className="container mx-auto px-4 pb-16">
          <div className="rounded-xl bg-muted/50 px-8 py-12 text-center">
            <h2 className="text-2xl font-bold mb-2">
              Looking for a {displayName} artist near you?
            </h2>
            <p className="text-muted-foreground mb-6">
              Browse our full directory of shops and artists.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Button asChild>
                <Link href={`/shops?styles=${encodeURIComponent(displayName)}`}>Find Shops</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/artists?styles=${encodeURIComponent(displayName)}`}>Find Artists</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
