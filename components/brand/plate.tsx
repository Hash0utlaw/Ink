"use client"

import Image from "next/image"
import { initials } from "@/lib/initials"
import { cn } from "@/lib/utils"
import { useImageFailed } from "./safe-image"
import { STYLE_EDGE_COLOR } from "./style-symbol"

interface PlateProps {
  /** Photo URL. Without one, the plate shows the artist's initials. */
  src?: string | null
  alt: string
  /** Used for the initials fallback. */
  name: string
  /** Style slug that colors the bottom edge of the initials fallback. */
  primaryStyle?: string | null
  /** Outer width in px; height follows the 4:5 ratio. */
  size?: number
  /** Fill the parent's width instead of a fixed size (initials scale with it). */
  fluid?: boolean
  /** next/image sizes hint for fluid plates. */
  sizes?: string
  /** No photo: initials (lists), or the compass (a single profile's header only). */
  fallback?: "initials" | "compass"
  className?: string
}

/**
 * The artist photo frame (docs/design/brand-pieces-reference.html, "Plate"):
 * 4:5, 1.5px ink outer border, 5px paper gap, 1px ink inner border.
 * No photo: vellum fill, initials in Young Serif, 5px bottom edge in the
 * primary style's plate-edge color (ink when the style has none). A single
 * profile's header shows the compass instead of initials (fallback="compass").
 * A photo that fails to load falls back the same way.
 */
export function Plate({
  src,
  alt,
  name,
  primaryStyle,
  size = 160,
  fluid = false,
  sizes,
  fallback = "initials",
  className,
}: PlateProps) {
  const { ref, failed, onError } = useImageFailed(src ?? null)
  const edge = (primaryStyle && STYLE_EDGE_COLOR[primaryStyle as keyof typeof STYLE_EDGE_COLOR]) || "hsl(var(--ink))"
  return (
    <div
      className={cn("aspect-[4/5] shrink-0 border-1.5 border-ink bg-paper p-[5px]", className)}
      style={fluid ? { width: "100%", containerType: "inline-size" } : { width: size }}
    >
      {src && !failed ? (
        <div className="relative h-full w-full overflow-hidden border border-ink">
          <Image
            ref={ref}
            src={src}
            alt={alt}
            fill
            sizes={sizes ?? (fluid ? "50vw" : `${size}px`)}
            className="object-cover"
            onError={onError}
          />
        </div>
      ) : fallback === "compass" ? (
        <div
          className="relative flex h-full w-full items-center justify-center border border-ink bg-vellum tex-vellum"
          style={{ borderBottomWidth: 5, borderBottomColor: edge }}
        >
          {/* 400x349 source; 70% of the plate's width, never stretched. */}
          <Image src="/brand/compass-color.webp" alt={alt} width={400} height={349} className="h-auto w-[70%]" />
        </div>
      ) : (
        <div
          className="flex h-full w-full items-center justify-center border border-ink bg-vellum tex-vellum"
          style={{ borderBottomWidth: 5, borderBottomColor: edge }}
          role="img"
          aria-label={alt}
        >
          <span className="font-heading leading-none text-ink" style={{ fontSize: fluid ? "36cqw" : Math.round(size * 0.36) }} aria-hidden="true">
            {initials(name) || "?"}
          </span>
        </div>
      )}
    </div>
  )
}
