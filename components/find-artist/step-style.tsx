"use client"

import { forwardRef, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { STYLES } from "@/lib/styles"
import { finderHref, resultsHref, type FinderAnswers } from "./finder-url"
import { PRIMARY_BUTTON, SECONDARY_BUTTON, StepFrame, TEXT_LINK } from "./finder-ui"

const MAX = 3
/** Tiles shown on a phone before "Show all 21 styles". */
const PHONE_TILES = 12

/**
 * Step 2: up to three styles, sorted by how many artists near you do each.
 * Picks live in the URL. "Show n artists" is the real total for the picks.
 */
export const StepStyle = forwardRef<HTMLHeadingElement, { answers: FinderAnswers }>(function StepStyle(
  { answers },
  headingRef,
) {
  const router = useRouter()
  const [picked, setPicked] = useState<string[]>(answers.styles.slice(0, MAX))
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [countsFailed, setCountsFailed] = useState(false)
  const [total, setTotal] = useState<number | null>(null)
  const [note, setNote] = useState("")
  const [showAll, setShowAll] = useState(false)

  const { lat, lng, r, near } = answers

  useEffect(() => {
    let cancelled = false
    setCounts(null)
    setCountsFailed(false)
    fetch(`/api/finder/style-counts?lat=${lat}&lng=${lng}&r=${r}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => !cancelled && setCounts(json.counts ?? {}))
      .catch(() => !cancelled && setCountsFailed(true))
    return () => {
      cancelled = true
    }
  }, [lat, lng, r])

  // The total for the current picks, debounced while they change.
  useEffect(() => {
    setTotal(null)
    if (picked.length === 0) return
    let cancelled = false
    const timer = setTimeout(() => {
      fetch(`/api/finder/style-counts?lat=${lat}&lng=${lng}&r=${r}&styles=${picked.join(",")}`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((json) => !cancelled && setTotal(Number(json.total ?? 0)))
        .catch(() => {})
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [lat, lng, r, picked])

  const tiles = useMemo(() => {
    const order = STYLES.map((s, i) => ({ ...s, i, count: counts?.[s.slug] ?? 0 }))
    return counts ? order.sort((a, b) => b.count - a.count || a.i - b.i) : order
  }, [counts])

  function toggle(slug: string) {
    let next: string[]
    if (picked.includes(slug)) {
      next = picked.filter((s) => s !== slug)
      setNote("")
    } else if (picked.length >= MAX) {
      setNote("You can pick up to 3.")
      return
    } else {
      next = [...picked, slug]
      setNote("")
    }
    setPicked(next)
    router.replace(finderHref({ ...answers, styles: next }, "style"), { scroll: false })
  }

  const all = counts?.__all
  const showLabel =
    picked.length === 0 ? "Show artists" : total === null ? "Show artists" : `Show ${total} ${total === 1 ? "artist" : "artists"}`

  return (
    <div className="flex flex-col gap-8">
      <StepFrame step={2} name="Style">
        <div className="flex flex-col gap-1.5">
          <h2 ref={headingRef} tabIndex={-1} className="font-heading text-[28px] leading-[1.15] focus:outline-none sm:text-[32px]">
            What style are you after?
          </h2>
          <p className="text-[15px] leading-normal text-ink-muted">
            Pick up to 3. Counts are artists within {r} miles of <strong className="font-semibold text-ink">{near}</strong>.{" "}
            <Link href={finderHref(answers)} className={TEXT_LINK}>
              Change
            </Link>
          </p>
          {countsFailed && (
            <p className="text-[15px] font-semibold text-flash-red" role="alert">
              We couldn&apos;t count artists near you right now. You can still pick styles.
            </p>
          )}
        </div>

        <fieldset>
          <legend className="sr-only">Styles, pick up to 3</legend>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {tiles.map((style, index) => {
              const selected = picked.includes(style.slug)
              const none = counts !== null && style.count === 0
              const hiddenOnPhone = !showAll && !selected && index >= PHONE_TILES
              return (
                <button
                  key={style.slug}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggle(style.slug)}
                  className={cn(
                    "relative flex min-h-[78px] flex-col justify-center gap-1 rounded border-1.5 border-ink px-3 py-3.5 text-left sm:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selected ? "bg-ink text-cream" : "bg-vellum text-ink hover:bg-secondary",
                    none && !selected && "opacity-[0.55]",
                    hiddenOnPhone && "max-sm:hidden",
                  )}
                >
                  {selected && (
                    <span
                      aria-hidden="true"
                      className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center border-1.5 border-cream"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                  )}
                  <span className={cn("font-heading text-[18px] leading-[1.15] sm:text-[19px]", selected && "pr-[22px]")}>{style.label}</span>
                  <span className={cn("text-[13px] tabular-nums", selected ? "text-cream/80" : "text-ink-muted")}>
                    {counts === null ? (countsFailed ? " " : "Counting…") : none ? "None nearby" : `${style.count} near you`}
                  </span>
                </button>
              )
            })}
          </div>
          {!showAll && (
            <button type="button" onClick={() => setShowAll(true)} className={cn("mt-2 min-h-11 sm:hidden", TEXT_LINK)}>
              Show all {STYLES.length} styles
            </button>
          )}
          <p aria-live="polite" className="mt-2 text-[15px] font-semibold text-flash-red empty:hidden">
            {note}
          </p>
        </fieldset>

        <Link
          href={resultsHref({ ...answers, styles: [] })}
          className="flex min-h-11 flex-col gap-1 rounded border-1.5 border-dashed border-ink bg-paper tex-paper px-4 py-3.5 text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="font-heading text-[18px]">Not sure yet</span>
          <span className="text-[13px] text-ink-muted">
            Show me every artist near me{typeof all === "number" ? `, all ${all}` : ""}
          </span>
        </Link>
      </StepFrame>

      <div className="flex gap-2.5 sm:justify-end">
        <Link href={finderHref({ ...answers, styles: picked })} className={cn(SECONDARY_BUTTON, "max-sm:flex-1")}>
          Back
        </Link>
        <button
          type="button"
          disabled={picked.length === 0}
          onClick={() => router.push(resultsHref({ ...answers, styles: picked }))}
          className={cn(PRIMARY_BUTTON, "max-sm:flex-[2]")}
        >
          {showLabel}
        </button>
      </div>
    </div>
  )
})
