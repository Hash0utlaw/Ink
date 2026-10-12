"use client"

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plate } from "@/components/brand/plate"

/** A portfolio photo: a URL, or a URL with its caption. */
export type PortfolioImage = string | { src: string; caption?: string | null }

/**
 * Real portfolio photos as framed plates (4:5, 1.5px ink, 5px paper gap, 1px ink
 * inner line), 2 across, 4 from md; each opens larger. A caption shows only when
 * the photo has one. Callers pass only loadable URLs.
 */
export function PortfolioGallery({ images, name }: { images: PortfolioImage[]; name: string }) {
  return (
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {images.map((image, i) => {
        const { src, caption } = typeof image === "string" ? { src: image, caption: null } : image
        const alt = caption || `Portfolio piece ${i + 1} by ${name}`
        return (
          <li key={src}>
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  aria-label={`Open portfolio piece ${i + 1} by ${name}`}
                  className="block w-full rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Plate src={src} alt={alt} name={name} fluid sizes="(min-width: 768px) 180px, 50vw" />
                </button>
              </DialogTrigger>
              {caption && <p className="mt-1.5 text-[13px] leading-[1.4] text-ink-muted text-pretty">{caption}</p>}
              <DialogContent className="max-w-3xl border-2 border-ink bg-vellum tex-vellum p-2 pt-14">
                <DialogTitle className="sr-only">{`Portfolio piece ${i + 1} by ${name}`}</DialogTitle>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={alt} className="h-auto w-full" />
              </DialogContent>
            </Dialog>
          </li>
        )
      })}
    </ul>
  )
}
