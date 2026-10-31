"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { stateAbbrToSlug } from "@/lib/utils/states"
import { parseLocation } from "@/lib/parse-location"
import { STYLES } from "@/lib/styles"
import { HOME_NEAR_KEY } from "./home-location"

const fieldClass =
  "h-12 w-full rounded border-1.5 border-ink bg-white px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
const linkClass = "inline-flex min-h-11 items-center text-left font-semibold text-navy underline underline-offset-2 hover:no-underline"

export function HeroSearch() {
  const router = useRouter()
  const { toast } = useToast()
  const [query, setQuery] = useState("")
  const [style, setStyle] = useState("")

  // A chosen style is added as ?styles=<slug>.
  const withStyle = (path: string) => {
    if (!style) return path
    return `${path}${path.includes("?") ? "&" : "?"}styles=${encodeURIComponent(style)}`
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const place = parseLocation(query)

    if (!place) {
      router.push(withStyle("/search"))
      return
    }

    // A state on its own goes to the state's shop page, unless a style is chosen:
    // that page has no style filter, so search the state instead.
    if (place.state && !place.city && !place.zip && !style) {
      router.push(`/tattoo-shops/${stateAbbrToSlug(place.state)}`)
      return
    }

    const params = new URLSearchParams()
    if (place.zip) params.set("zip", place.zip)
    if (place.city) params.set("city", place.city)
    if (place.state) params.set("state", place.state)
    router.push(withStyle(`/search?${params.toString()}`))
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

  return (
    <div className="w-full rounded border-2 border-ink bg-vellum tex-vellum p-[18px] md:p-6">
      {/* From 768px: Where, Style and Search share one row, on the fields' baseline. */}
      <form onSubmit={handleSearch} className="space-y-4 md:grid md:grid-cols-[1.3fr_1fr_auto] md:items-end md:gap-3 md:space-y-0">
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
        <div className="md:min-w-0">
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
        <Button type="submit" className="h-12 w-full border-1.5 border-ink text-base font-semibold md:w-auto md:px-7">
          Search
        </Button>
      </form>

      <div className="mt-3 flex flex-col items-start text-[15px] md:mt-2 md:flex-row md:flex-wrap md:gap-x-6">
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
