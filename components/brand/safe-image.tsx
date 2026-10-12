"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { initials } from "@/lib/initials"
import { cn } from "@/lib/utils"
import { allowedImageSrc } from "@/lib/utils/safe-image"
import { STYLE_EDGE_COLOR } from "./style-symbol"

/**
 * True once an <img> has failed to load. Also catches images that failed before
 * hydration, when React wasn't listening for the error event yet.
 */
export function useImageFailed(src: string | null) {
  const ref = useRef<HTMLImageElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
    const img = ref.current
    if (img && img.complete && img.naturalWidth === 0) setFailed(true)
  }, [src])
  return { ref, failed, onError: () => setFailed(true) }
}

interface SafeImageProps {
  /** Any image URL; one next/image can't load counts as missing. */
  src: string | null | undefined
  alt: string
  /** Whose initials the fallback shows (the artist or shop). */
  name: string
  /** Style slug that colors a 5px bottom edge on the fallback. */
  primaryStyle?: string | null
  /** Initials size in px. */
  initialsSize?: number
  /** false: plain vellum, for spots where the initials already show next to it. */
  showInitials?: boolean
  sizes?: string
  /** Classes for the image (e.g. object-cover, hover effects). */
  className?: string
}

/**
 * A next/image that fills its positioned parent. When the image is missing,
 * not loadable or broken, it shows the brand fallback instead: vellum with the
 * owner's initials in Young Serif, like the Plate without its frame.
 */
export function SafeImage({
  src,
  alt,
  name,
  primaryStyle,
  initialsSize = 32,
  showInitials = true,
  sizes,
  className,
}: SafeImageProps) {
  const url = allowedImageSrc(src)
  const { ref, failed, onError } = useImageFailed(url)

  if (!url || failed) {
    const edge = primaryStyle ? STYLE_EDGE_COLOR[primaryStyle as keyof typeof STYLE_EDGE_COLOR] : undefined
    return (
      <div
        className="absolute inset-0 flex items-center justify-center bg-vellum tex-vellum"
        style={edge ? { borderBottom: `5px solid ${edge}` } : undefined}
        role="img"
        aria-label={alt}
      >
        {showInitials && (
          <span className="font-heading leading-none text-ink" style={{ fontSize: initialsSize }} aria-hidden="true">
            {initials(name) || "?"}
          </span>
        )}
      </div>
    )
  }

  return <Image ref={ref} src={url} alt={alt} fill sizes={sizes} className={cn("object-cover", className)} onError={onError} />
}
