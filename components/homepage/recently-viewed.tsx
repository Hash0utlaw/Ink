"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { getRecentlyViewed, type RecentlyViewedArtist } from "@/components/utils/recently-viewed"
import { initials } from "@/lib/initials"
import { allowedImageSrc } from "@/lib/utils/safe-image"
import { useImageFailed } from "@/components/brand/safe-image"

/** 34px square mini-plate: the artist's photo, or their initials. */
function MiniPlate({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  const src = allowedImageSrc(avatarUrl)
  const { ref, failed, onError } = useImageFailed(src)
  return (
    <span className="relative flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden border-1.5 border-ink bg-vellum">
      {src && !failed ? (
        <Image ref={ref} src={src} alt="" fill sizes="34px" className="object-cover" onError={onError} />
      ) : (
        <span className="font-heading text-[13px] leading-none text-ink" aria-hidden="true">
          {initials(name) || "?"}
        </span>
      )}
    </span>
  )
}

export function RecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedArtist[]>([])

  useEffect(() => {
    setItems(getRecentlyViewed())
  }, [])

  if (items.length === 0) return null

  return (
    <section aria-labelledby="recently-viewed-label" className="mx-auto w-full max-w-[1344px] px-6">
      <div className="flex items-center gap-4">
        <h2 id="recently-viewed-label" className="shrink-0 font-sans text-[15px] font-semibold text-ink-muted">
          Recently viewed
        </h2>
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {items.map((artist) => (
            <Link
              key={artist.id}
              href={`/artists/${artist.id}`}
              className="flex shrink-0 items-center gap-2 rounded border-1.5 border-ink bg-vellum tex-vellum py-1 pl-1 pr-3 hover:bg-secondary"
            >
              <MiniPlate name={artist.name} avatarUrl={artist.avatarUrl} />
              <span className="whitespace-nowrap text-[15px] font-semibold text-ink">{artist.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
