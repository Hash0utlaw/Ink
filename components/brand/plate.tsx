import Image from "next/image"
import { initials } from "@/lib/initials"
import { cn } from "@/lib/utils"
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
  className?: string
}

/**
 * The artist photo frame (docs/design/brand-pieces-reference.html, "Plate"):
 * 4:5, 1.5px ink outer border, 5px paper gap, 1px ink inner border.
 * No photo: vellum fill, initials in Young Serif, 5px bottom edge in the
 * primary style's plate-edge color (ink when the style has none).
 */
export function Plate({ src, alt, name, primaryStyle, size = 160, className }: PlateProps) {
  const edge = (primaryStyle && STYLE_EDGE_COLOR[primaryStyle as keyof typeof STYLE_EDGE_COLOR]) || "hsl(var(--ink))"
  return (
    <div
      className={cn("aspect-[4/5] shrink-0 border-1.5 border-ink bg-paper p-[5px]", className)}
      style={{ width: size }}
    >
      {src ? (
        <div className="relative h-full w-full overflow-hidden border border-ink">
          <Image src={src} alt={alt} fill sizes={`${size}px`} className="object-cover" />
        </div>
      ) : (
        <div
          className="flex h-full w-full items-center justify-center border border-ink bg-vellum"
          style={{ borderBottomWidth: 5, borderBottomColor: edge }}
          role="img"
          aria-label={alt}
        >
          <span className="font-heading leading-none text-ink" style={{ fontSize: Math.round(size * 0.36) }} aria-hidden="true">
            {initials(name) || "?"}
          </span>
        </div>
      )}
    </div>
  )
}
