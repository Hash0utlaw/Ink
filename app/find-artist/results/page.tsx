import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, MapPin, Wand2, ArrowLeft } from "lucide-react"
import { getArtists } from "@/lib/supabase/artists"
import type { Artist } from "@/types/artist"
import { styleLabel, toStyleSlugs } from "@/lib/styles"
import { initials } from "@/lib/initials"

export const metadata: Metadata = {
  title: "Your Artist Matches — TattooMaps",
}

const BUDGET_TO_PRICE: Record<string, string[]> = {
  low: ["low"],
  medium: ["low", "medium"],
  high: ["medium", "high"],
  luxury: ["high"],
}

function scoreArtist(
  artist: Artist,
  opts: { style: string; size: string; budget: string; city: string; state: string }
): number {
  let score = 0
  if (opts.style && artist.styles.includes(opts.style)) {
    score += 3
  }
  if (opts.city && artist.location.city?.toLowerCase() === opts.city.toLowerCase()) {
    score += 2
  } else if (opts.state && artist.location.state?.toLowerCase() === opts.state.toLowerCase()) {
    score += 1
  }
  if (opts.budget) {
    const allowed = BUDGET_TO_PRICE[opts.budget] ?? []
    if (allowed.includes(artist.priceRange)) score += 1
  }
  return score
}

function matchLabel(score: number, maxScore: number): { label: string; color: string } {
  const pct = maxScore > 0 ? score / maxScore : 0
  if (pct >= 0.8) return { label: "Top match", color: "bg-success text-success-foreground border-success" }
  if (pct >= 0.5) return { label: "Great match", color: "bg-secondary text-primary border-ink" }
  return { label: "Good match", color: "bg-muted text-muted-foreground border-border" }
}


function priceLabel(range: string) {
  return { low: "$", medium: "$$", high: "$$$" }[range] ?? "$$"
}

export default async function FindArtistResultsPage({
  searchParams,
}: {
  searchParams: { style?: string; size?: string; budget?: string; city?: string; state?: string }
}) {
  const { size = "", budget = "", city = "", state: stateParam = "" } = searchParams
  // ?style= is a slug; old links may carry a name ("Fine Line") — map it.
  const style: string = searchParams.style ? toStyleSlugs([searchParams.style])[0] ?? "" : ""
  const styleName = style ? styleLabel(style) ?? style : ""

  const filters: Parameters<typeof getArtists>[0] = {}
  if (style) filters.styles = [style]
  if (stateParam) filters.state = stateParam
  if (city) filters.city = city
  filters.pageSize = 48

  const { data: artists } = await getArtists(filters)

  const scored = artists
    .map((a) => ({ artist: a, score: scoreArtist(a, { style, size, budget, city, state: stateParam }) }))
    .sort((a, b) => b.score - a.score)
    .filter((r) => r.score > 0 || (!style && !city && !stateParam))

  const maxScore = scored.length > 0 ? scored[0].score : 1
  const locationLabel = city ? `${city}${stateParam ? `, ${stateParam}` : ""}` : stateParam || "nationwide"

  return (
    <div className="flex min-h-screen flex-col bg-paper tex-paper">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main className="flex-1">
        {/* Result header */}
        <div className="border-b border-border/50 bg-muted/30">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-3 mb-3">
              <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
                <Link href="/find-artist">
                  <ArrowLeft className="w-4 h-4" /> Refine search
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-secondary p-2">
                <Wand2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold">
                  {scored.length} {scored.length === 1 ? "artist" : "artists"} match{scored.length === 1 ? "es" : ""} your style
                </h1>
                <p className="text-sm text-muted-foreground">
                  {style && <span className="font-medium">{styleName}</span>}
                  {style && locationLabel && " · "}
                  {locationLabel && <span>{locationLabel}</span>}
                  {size && ` · ${size}`}
                </p>
              </div>
            </div>

            {/* Active filter pills */}
            <div className="flex flex-wrap gap-2 mt-4">
              {[
                style && { key: "style", label: styleName },
                size && { key: "size", label: size },
                budget && { key: "budget", label: { low: "Under $200", medium: "$200–$500", high: "$500–$1,000", luxury: "$1,000+" }[budget] ?? budget },
                city && { key: "city", label: city },
                stateParam && { key: "state", label: stateParam },
              ]
                .filter(Boolean)
                .map((f) => f && (
                  <Badge key={f.key} variant="secondary" className="text-xs">{f.label}</Badge>
                ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {scored.length === 0 ? (
            <div className="py-24 text-center">
              <Wand2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-semibold">No exact matches found</p>
              <p className="text-sm text-muted-foreground mt-1 mb-6">Try broadening your search — remove location or try a different style.</p>
              <Button asChild className="bg-primary hover:bg-primary/90">
                <Link href="/find-artist">Refine my search</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {scored.map(({ artist, score }) => {
                const match = matchLabel(score, maxScore)
                const loc = [artist.location.city, artist.location.state].filter(Boolean).join(", ")
                return (
                  <Link
                    key={artist.id}
                    href={`/artists/${artist.id}`}
                    className="group flex gap-4 p-4 rounded-lg border border-border/50 bg-vellum tex-vellum hover:border-ink transition-all"
                  >
                    <Avatar className="w-16 h-16 shrink-0 border-2 border-ink">
                      <AvatarImage src={artist.avatarUrl} alt={artist.name} />
                      <AvatarFallback className="text-lg bg-vellum text-ink font-heading border-1.5 border-ink">
                        {initials(artist.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-sm leading-tight">{artist.name}</p>
                        <Badge className={`shrink-0 text-xs ${match.color}`}>{match.label}</Badge>
                      </div>

                      {artist.shopName && (
                        <p className="text-xs text-muted-foreground">at {artist.shopName}</p>
                      )}

                      {loc && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />{loc}
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {artist.rating > 0 && (
                          <span className="flex items-center gap-0.5 text-xs">
                            <Star className="w-3 h-3 text-flash-yellow fill-flash-yellow" />
                            {artist.rating}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{priceLabel(artist.priceRange)}</span>
                        {artist.isClaimed && artist.isAvailable && (
                          <span className="text-xs text-success">Available</span>
                        )}
                      </div>

                      {artist.styles.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {artist.styles.slice(0, 3).map((slug) => (
                            <Badge key={slug} variant="secondary" className={`text-xs ${slug === style ? "border-ink text-primary" : ""}`}>
                              {styleLabel(slug)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {scored.length > 0 && (
            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground mb-3">Not seeing the right fit?</p>
              <div className="flex justify-center gap-3 flex-wrap">
                <Button variant="outline" asChild>
                  <Link href="/find-artist">← Refine search</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/artists">Browse all artists</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
