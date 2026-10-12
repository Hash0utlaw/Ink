"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { toStyleSlugs } from "@/lib/styles"
import { StepWhere } from "./step-where"
import { StepStyle } from "./step-style"
import { BrowseAllLine, FinderIntro } from "./finder-ui"
import type { FinderAnswers } from "./finder-url"

const RADII = [10, 25, 50, 100]

/** The answers in the URL; null place when lat/lng are missing or invalid. */
function readAnswers(params: URLSearchParams): { place: FinderAnswers | null; radius: number; styles: string[] } {
  const r = Number(params.get("r"))
  const radius = RADII.includes(r) ? r : 25
  const styles = toStyleSlugs(params.get("style")?.split(",").filter(Boolean) ?? []).slice(0, 3)
  const latText = params.get("lat")
  const lngText = params.get("lng")
  const lat = Number(latText)
  const lng = Number(lngText)
  const near = params.get("near")?.trim().slice(0, 80) ?? ""
  const valid =
    !!latText && !!lngText && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  return { place: valid && near ? { near, lat, lng, r: radius, styles } : null, radius, styles }
}

/**
 * The artist finder: step 1 (where) and step 2 (style), both driven by the URL
 * so Back and refresh keep the answers. Focus moves to the step's heading
 * whenever the step changes.
 */
export function FindArtistWizard() {
  const searchParams = useSearchParams()
  const { place, radius, styles } = readAnswers(searchParams)
  const step = searchParams.get("step") === "style" && place ? 2 : 1

  const introRef = useRef<HTMLHeadingElement>(null)
  const styleHeadingRef = useRef<HTMLHeadingElement>(null)
  // Only on a real step change, never on first load (or React's double effect run in dev).
  const shownStep = useRef(step)

  useEffect(() => {
    if (shownStep.current === step) return
    shownStep.current = step
    ;(step === 2 ? styleHeadingRef : introRef).current?.focus()
  }, [step])

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-8 px-4 pb-20 pt-10 sm:px-6 sm:pt-16",
        step === 2 ? "max-w-[900px]" : "max-w-[620px]",
      )}
    >
      <FinderIntro ref={introRef} />
      {step === 2 && place ? (
        <StepStyle key={`${place.lat},${place.lng},${place.r}`} ref={styleHeadingRef} answers={place} />
      ) : (
        <StepWhere
          key={place ? `${place.near}|${place.r}` : "empty"}
          initialPlace={place ? { label: place.near, lat: place.lat, lng: place.lng } : null}
          initialRadius={radius}
          styles={styles}
        />
      )}
      <BrowseAllLine />
    </div>
  )
}
