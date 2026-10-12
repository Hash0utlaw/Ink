"use client"

import { SafeImage } from "@/components/brand/safe-image"

/**
 * The results card's plate: 4:5, 1.5px ink frame, 4px paper gap, 1px ink inner
 * line with a navy bottom edge. The artist's photo when it loads, else their
 * initials in Young Serif.
 */
export function FinderPlate({ src, name }: { src: string; name: string }) {
  return (
    <div className="aspect-[4/5] w-[104px] shrink-0 border-1.5 border-ink bg-paper p-1">
      <div className="relative h-full w-full overflow-hidden border border-b-4 border-ink border-b-navy bg-vellum tex-vellum">
        <SafeImage src={src} alt={name} name={name} initialsSize={40} sizes="104px" />
      </div>
    </div>
  )
}
