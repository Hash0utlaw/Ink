"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Search, MapPin, Sparkles, Users, Star, Wand2, LocateFixed } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { STATE_NAME_TO_ABBR, STATE_ABBR_TO_NAME, stateAbbrToSlug } from "@/lib/utils/states"

interface HeroSectionProps {
  stats?: {
    shopCount: number
    artistCount: number
    cityCount: number
  }
}

export function HeroSection({ stats }: HeroSectionProps = {}) {
  const router = useRouter()
  const { toast } = useToast()
  const [query, setQuery] = useState("")

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()

    if (!q) {
      router.push("/search")
      return
    }

    if (/^\d{5}$/.test(q)) {
      router.push(`/shops?zip=${q}`)
      return
    }

    if (q.length === 2) {
      const abbr = STATE_ABBR_TO_NAME[q.toUpperCase()] ? q.toUpperCase() : null
      if (abbr) {
        router.push(`/tattoo-shops/${stateAbbrToSlug(abbr)}`)
        return
      }
    } else {
      const abbr = STATE_NAME_TO_ABBR[q.toLowerCase()]
      if (abbr) {
        router.push(`/tattoo-shops/${stateAbbrToSlug(abbr)}`)
        return
      }
    }

    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  function handleNearMe() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      toast({ description: "Location not available" })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sessionStorage.setItem("tm_lat", String(pos.coords.latitude))
        sessionStorage.setItem("tm_lng", String(pos.coords.longitude))
        router.push("/shops?nearme=1")
      },
      () => toast({ description: "Location not available" })
    )
  }

  const hasAnyStat = Boolean(stats && (stats.shopCount > 0 || stats.artistCount > 0 || stats.cityCount > 0))

  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 hero-grid opacity-50" />

      <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-hero-accent/20 to-hero-secondary/20 rounded-full blur-xl animate-float" />
      <div
        className="absolute bottom-20 right-10 w-48 h-48 bg-gradient-to-br from-hero-tertiary/20 to-hero-accent/20 rounded-full blur-xl animate-float"
        style={{ animationDelay: "2s" }}
      />
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-gradient-to-br from-hero-secondary/20 to-hero-tertiary/20 rounded-full blur-xl animate-pulse-slow" />

      <div className="relative z-20 container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-sm text-white/80">
                <Sparkles className="w-4 h-4" />
                <span>Discover Your Perfect Ink</span>
              </div>

              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tight text-white hero-text-glow">
                TATTOO
                <span className="block text-transparent bg-gradient-to-r from-hero-accent via-hero-secondary to-hero-tertiary bg-clip-text">
                  MAPS
                </span>
              </h1>

              <p className="max-w-2xl mx-auto text-xl md:text-2xl text-white/70 leading-relaxed font-light">
                Connect with world-class tattoo artists.
                <br className="hidden md:block" />
                Explore portfolios. Book your next masterpiece.
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSearch} className="hero-card p-6">
                <div className="flex flex-col lg:flex-row items-center gap-4">
                  <div className="relative flex-grow w-full">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                    <Input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Artist, style, city or ZIP code..."
                      className="pl-12 bg-white/5 border-white/20 focus:border-hero-accent text-white placeholder:text-white/50 h-14 text-lg rounded-xl"
                    />
                  </div>
                  <Button type="submit" className="hero-button-primary w-full lg:w-auto h-14 text-lg">
                    <Search className="mr-2 h-5 w-5" />
                    Search
                  </Button>
                </div>
              </form>
              <div className="mt-4 text-center flex items-center justify-center gap-4 flex-wrap">
                <Link
                  href="/find-artist"
                  className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white/90 transition-colors"
                >
                  <Wand2 className="w-4 h-4" />
                  Not sure what style you want? Try the Artist Finder →
                </Link>
                <button
                  type="button"
                  onClick={handleNearMe}
                  className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white/90 transition-colors"
                >
                  <LocateFixed className="w-4 h-4" />
                  Near me
                </button>
              </div>
            </div>

            {hasAnyStat && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16">
                {stats && stats.artistCount > 0 && (
                  <div className="hero-card p-6 text-center group hover:scale-105 transition-transform duration-300">
                    <div className="w-12 h-12 bg-gradient-to-br from-hero-accent to-hero-secondary rounded-xl mx-auto mb-4 flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">{stats.artistCount.toLocaleString()}</div>
                    <div className="text-white/60">Artists listed</div>
                  </div>
                )}

                {stats && stats.shopCount > 0 && (
                  <div className="hero-card p-6 text-center group hover:scale-105 transition-transform duration-300">
                    <div className="w-12 h-12 bg-gradient-to-br from-hero-secondary to-hero-tertiary rounded-xl mx-auto mb-4 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">{stats.shopCount.toLocaleString()}</div>
                    <div className="text-white/60">Shops mapped</div>
                  </div>
                )}

                {stats && stats.cityCount > 0 && (
                  <div className="hero-card p-6 text-center group hover:scale-105 transition-transform duration-300">
                    <div className="w-12 h-12 bg-gradient-to-br from-hero-tertiary to-hero-accent rounded-xl mx-auto mb-4 flex items-center justify-center">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">{stats.cityCount.toLocaleString()}</div>
                    <div className="text-white/60">Cities covered</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
