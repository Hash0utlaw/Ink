"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { STATE_NAME_TO_ABBR, STATE_ABBR_TO_NAME, stateAbbrToSlug } from "@/lib/utils/states"
import { STYLES } from "@/lib/styles"
import { HOME_NEAR_KEY } from "./home-location"

interface HeroSearchProps {
  shopCount: number
  artistCount: number
}

/** Rounded down to the nearest thousand, e.g. 26,437 -> "26,000". */
function roundedThousands(n: number): string {
  return (Math.floor(n / 1000) * 1000).toLocaleString("en-US")
}

const fieldClass =
  "h-12 w-full rounded-lg border-1.5 border-ink bg-white px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
const linkClass = "font-semibold text-navy underline underline-offset-2 hover:no-underline"

export function HeroSearch({ shopCount, artistCount }: HeroSearchProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [query, setQuery] = useState("")
  const [style, setStyle] = useState("")

  // The routes and params below are the ones the previous hero used; a chosen
  // style is added as ?styles=<slug> where the destination already reads it.
  const withStyle = (path: string) => {
    if (!style) return path
    return `${path}${path.includes("?") ? "&" : "?"}styles=${encodeURIComponent(style)}`
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()

    if (!q) {
      router.push(withStyle("/search"))
      return
    }

    if (/^\d{5}$/.test(q)) {
      router.push(withStyle(`/shops?zip=${q}`))
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

    router.push(withStyle(`/search?q=${encodeURIComponent(q)}`))
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
        // /shops clears tm_lat/tm_lng once it reads them; the homepage keeps its own copy.
        sessionStorage.setItem(HOME_NEAR_KEY, JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }))
        router.push(withStyle("/shops?nearme=1"))
      },
      () => toast({ description: "Location not available" })
    )
  }

  const counts = shopCount > 0 && artistCount > 0
  return (
    <div className="w-full rounded-lg border-2 border-ink bg-vellum p-5 sm:p-7 lg:max-w-[470px] lg:p-8">
      <h1 className="text-balance font-heading text-[32px] leading-[1.08] text-ink md:text-[40px] xl:text-[44px]">
        Find a tattoo artist near you
      </h1>
      <p className="mt-3 text-pretty text-base leading-[1.55] text-ink-muted lg:mt-4 lg:text-[17px]">
        {counts
          ? `Search ${roundedThousands(shopCount)} shops and ${roundedThousands(artistCount)} artists by place and style, then send a request straight to the artist. Free, with no booking fees.`
          : "Search shops and artists by place and style, then send a request straight to the artist. Free, with no booking fees."}
      </p>

      <form onSubmit={handleSearch} className="mt-6 space-y-4 lg:mt-4">
        <div>
          <label htmlFor="hero-where" className="mb-1.5 block text-[15px] font-semibold text-ink">
            Where
          </label>
          <Input
            id="hero-where"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="City, state or ZIP"
            autoComplete="address-level2"
            className={fieldClass}
          />
        </div>
        {/* Desktop: Style takes the row, Search sits to its right on the select's baseline. */}
        <div className="space-y-4 lg:flex lg:items-end lg:gap-3 lg:space-y-0">
          <div className="lg:min-w-0 lg:flex-1">
            <label htmlFor="hero-style" className="mb-1.5 block text-[15px] font-semibold text-ink">
              Style
            </label>
            <select id="hero-style" value={style} onChange={(e) => setStyle(e.target.value)} className={fieldClass}>
              <option value="">Any style</option>
              {STYLES.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" className="h-12 w-full border-1.5 border-ink text-base font-semibold lg:w-auto lg:shrink-0 lg:px-7">
            Search
          </Button>
        </div>
      </form>

      <div className="mt-5 flex flex-col items-start gap-2 text-[15px] lg:mt-4 lg:flex-row lg:flex-wrap lg:gap-x-6 lg:gap-y-2">
        <button type="button" onClick={handleNearMe} className={linkClass}>
          Use my location
        </button>
        <Link href="/find-artist" className={linkClass}>
          Not sure what style you want? Try the Artist Finder
        </Link>
      </div>
    </div>
  )
}
