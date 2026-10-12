"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Crosshair, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { finderHref } from "./finder-url"
import { PRIMARY_BUTTON, StepFrame } from "./finder-ui"

const RADII = [10, 25, 50, 100] as const

const NOT_FOUND = "We couldn't find that place. Try a city and state, like Tampa, FL, or a ZIP code."
const NO_LOCATION = "We couldn't get your location. Type a city or ZIP instead."
const EMPTY = "Type a city and state, or a ZIP code."

interface Place {
  label: string
  lat: number
  lng: number
}

/**
 * Step 1: where are you, and how far will you travel. A typed place is looked
 * up when you press Next; "Use my location" fills the field with the nearest
 * city. Every failure says so under the field.
 */
export function StepWhere({
  initialPlace,
  initialRadius,
  styles,
}: {
  /** From the URL when coming back with "Change". */
  initialPlace: Place | null
  initialRadius: number
  /** Picks so far, kept when the place changes. */
  styles: string[]
}) {
  const router = useRouter()
  const [text, setText] = useState(initialPlace?.label ?? "")
  const [resolved, setResolved] = useState<Place | null>(initialPlace)
  const [radius, setRadius] = useState(initialRadius)
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")
  const [busy, setBusy] = useState<"lookup" | "locate" | null>(null)

  function goTo(place: Place) {
    router.push(finderHref({ near: place.label, lat: place.lat, lng: place.lng, r: radius, styles }, "style"))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setStatus("")
    const q = text.trim()
    if (resolved && q === resolved.label) return goTo(resolved)
    if (!q) return setError(EMPTY)
    setBusy("lookup")
    try {
      const res = await fetch(`/api/finder/place?q=${encodeURIComponent(q)}`)
      const json = res.ok ? await res.json() : null
      if (json?.place) {
        setResolved(json.place)
        goTo(json.place)
        return
      }
      setError(NOT_FOUND)
    } catch {
      setError(NOT_FOUND)
    } finally {
      setBusy(null)
    }
  }

  function locateMe() {
    setError("")
    setStatus("")
    if (!("geolocation" in navigator)) return setError(NO_LOCATION)
    setBusy("locate")
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(`/api/finder/place?lat=${coords.latitude}&lng=${coords.longitude}`)
          const json = res.ok ? await res.json() : null
          if (!json?.place) throw new Error("no place")
          setResolved(json.place)
          setText(json.place.label)
          setStatus(`Using your location: ${json.place.label}.`)
        } catch {
          setError(NO_LOCATION)
        } finally {
          setBusy(null)
        }
      },
      () => {
        setError(NO_LOCATION)
        setBusy(null)
      },
      { timeout: 10000, maximumAge: 300000 },
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
      <StepFrame step={1} name="Where">
        <div className="flex flex-col gap-2">
          <label htmlFor="finder-where" className="text-[15px] font-semibold">
            Where are you?
          </label>
          <input
            id="finder-where"
            type="text"
            className="min-h-[52px] rounded border-1.5 border-ink bg-white px-3.5 text-[17px] text-ink placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            autoComplete="address-level2"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError("")
              setStatus("")
            }}
            placeholder="City and state, or ZIP"
            aria-describedby="finder-where-hint finder-where-message"
            aria-invalid={error ? true : undefined}
          />
          <span id="finder-where-hint" className="text-[13px] text-ink-muted">
            City and state, or a ZIP code
          </span>
          <p id="finder-where-message" aria-live="polite" className="text-[15px] empty:hidden">
            {error ? <span className="font-semibold text-flash-red">{error}</span> : status}
          </p>
        </div>

        <div className="flex items-center gap-3 text-[13px] text-ink-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-rule" />
          or
          <span className="h-px flex-1 bg-rule" />
        </div>

        <button
          type="button"
          onClick={locateMe}
          disabled={busy !== null}
          className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded border-1.5 border-ink bg-paper tex-paper px-[22px] text-base font-semibold text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {busy === "locate" ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
          ) : (
            <Crosshair className="h-[18px] w-[18px]" aria-hidden="true" />
          )}
          {busy === "locate" ? "Finding you…" : "Use my location"}
        </button>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[15px] font-semibold">How far will you travel?</legend>
          <div className="grid grid-cols-4 gap-2">
            {RADII.map((r) => (
              <label key={r} className="relative">
                <input
                  type="radio"
                  name="finder-radius"
                  value={r}
                  checked={radius === r}
                  onChange={() => setRadius(r)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center justify-center rounded border-1.5 border-ink text-[15px] font-semibold tabular-nums",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
                    radius === r ? "bg-ink text-cream" : "bg-vellum text-ink hover:bg-secondary",
                  )}
                >
                  {r} mi
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </StepFrame>

      <div className="flex justify-end">
        <button type="submit" disabled={busy !== null} className={cn(PRIMARY_BUTTON, "w-full sm:w-auto")}>
          {busy === "lookup" ? "Finding that place…" : "Next: pick a style"}
        </button>
      </div>
    </form>
  )
}
