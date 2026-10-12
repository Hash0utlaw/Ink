import { notFound } from "next/navigation"
import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { MapPin, Star, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { getArtistBySlug } from "@/lib/supabase/artists"
import { getFlashById } from "@/lib/supabase/flash"
import { PublicBookingForm } from "@/components/booking/public-booking-form"
import { createClient } from "@/utils/supabase/server"
import { allowedImageSrc } from "@/lib/utils/safe-image"
import { SafeImage } from "@/components/brand/safe-image"
import { styleLabel, styleLabels } from "@/lib/styles"
import { initials } from "@/lib/initials"
import { requestNextStep } from "@/lib/request-copy"

async function getPortfolioImages(artistId: string): Promise<string[]> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("portfolio_images")
      .select("image_url")
      .eq("artist_id", artistId)
      .order("display_order", { ascending: true })
      .limit(3)
    return (data ?? []).map((r: { image_url: string }) => r.image_url).filter(Boolean)
  } catch {
    return []
  }
}


export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const artist = await getArtistBySlug(params.slug)
  if (!artist) return { title: "Book a Tattoo Artist — TattooMaps" }
  return {
    title: `Book ${artist.name} — TattooMaps`,
    description: `Send a booking brief to ${artist.name}${artist.location.city ? ` in ${artist.location.city}` : ""}. No payment required.`,
  }
}

export default async function BookArtistPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { flash?: string }
}) {
  const artist = await getArtistBySlug(params.slug)
  if (!artist) notFound()

  const [allPortfolioImages, flashListing] = await Promise.all([
    getPortfolioImages(artist.id),
    searchParams.flash ? getFlashById(searchParams.flash) : Promise.resolve(null),
  ])

  // Only photos next/image can load; no placeholders.
  const portfolioImages = allPortfolioImages.filter((url) => allowedImageSrc(url))
  const location = [artist.location.city, artist.location.state].filter(Boolean).join(", ")

  return (
    <div className="flex min-h-screen flex-col bg-paper tex-paper">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b border-border/50 bg-muted/30">
          <div className="container mx-auto px-4 py-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link href="/artists" className="hover:text-foreground transition-colors">Artists</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/artists/${artist.id}`} className="hover:text-foreground transition-colors">{artist.name}</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">Book</span>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 md:py-12 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* Left — Artist info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Artist card */}
              <Card className="bg-muted/30 border-border/50">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-20 h-20 border-2 border-ink shrink-0">
                      <AvatarImage src={artist.avatarUrl || ""} alt={artist.name} />
                      <AvatarFallback className="text-2xl bg-vellum text-ink font-heading border-1.5 border-ink">
                        {initials(artist.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h1 className="text-xl font-extrabold leading-tight">{artist.name}</h1>
                      {artist.shopName && (
                        <p className="text-sm text-muted-foreground mt-0.5">at {artist.shopName}</p>
                      )}
                      {location && (
                        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5" />
                          {location}
                        </div>
                      )}
                      {artist.rating > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3.5 h-3.5 text-flash-yellow fill-flash-yellow" />
                          <span className="text-sm font-semibold">{artist.rating}</span>
                          <span className="text-xs text-muted-foreground">({artist.reviewCount})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {artist.styles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {styleLabels(artist.styles).slice(0, 6).map((label) => (
                        <Badge key={label} variant="secondary" className="text-xs">{label}</Badge>
                      ))}
                    </div>
                  )}

                  {artist.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{artist.bio}</p>
                  )}

                  <Link
                    href={`/artists/${artist.id}`}
                    className="text-xs text-navy underline-offset-2 hover:underline"
                  >
                    View full profile →
                  </Link>
                </CardContent>
              </Card>

              {/* Portfolio strip */}
              {portfolioImages.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Recent Work</p>
                  <div className="grid grid-cols-3 gap-2">
                    {portfolioImages.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <SafeImage
                          src={url}
                          alt={`${artist.name} portfolio ${i + 1}`}
                          name={artist.name}
                          showInitials={false}
                          sizes="160px"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trust signals */}
              <div className="text-xs text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground text-sm">How it works</p>
                <p>1. Fill out the brief below — describe your idea in detail.</p>
                <p>2. {requestNextStep({ name: artist.name, shopName: artist.shopName, hasAccount: artist.hasAccount })}</p>
                <p>3. Confirm the appointment and lock in your session.</p>
              </div>
            </div>

            {/* Right — Booking form */}
            <div className="lg:col-span-3">
              <Card className="bg-muted/30 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {flashListing ? `Book: ${flashListing.title}` : `Send a brief to ${artist.name}`}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    No payment required. Share your idea below.
                  </p>
                </CardHeader>
                <CardContent>
                  {!artist.isClaimed && (
                    <p className="text-xs text-muted-foreground bg-muted/50 border border-border/50 rounded-md px-3 py-2 mb-4">
                      This artist hasn&apos;t claimed their profile yet. Send your brief and we&apos;ll invite them to respond.
                    </p>
                  )}
                  <PublicBookingForm
                    artistId={artist.id}
                    artistName={artist.name}
                    shopName={artist.shopName}
                    hasAccount={artist.hasAccount}
                    prefill={flashListing ? {
                      description: `I'd like to book your flash design: "${flashListing.title}"${flashListing.description ? `. ${flashListing.description}` : ""}`,
                      style: flashListing.style ? styleLabel(flashListing.style) ?? flashListing.style : undefined,
                      size: flashListing.size ?? undefined,
                    } : undefined}
                  />
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
