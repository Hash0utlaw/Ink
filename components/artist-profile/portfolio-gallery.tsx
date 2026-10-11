"use client"

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plate } from "@/components/brand/plate"

/** Real portfolio photos in plates; each opens larger. Callers pass only loadable URLs. */
export function PortfolioGallery({ images, name }: { images: string[]; name: string }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {images.map((src, i) => (
        <li key={src}>
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label={`Open portfolio piece ${i + 1} by ${name}`}
                className="block w-full rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Plate src={src} alt={`Portfolio piece ${i + 1} by ${name}`} name={name} fluid sizes="(min-width: 1024px) 240px, 45vw" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl border-2 border-ink bg-vellum tex-vellum p-2">
              <DialogTitle className="sr-only">{`Portfolio piece ${i + 1} by ${name}`}</DialogTitle>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Portfolio piece ${i + 1} by ${name}`} className="h-auto w-full" />
            </DialogContent>
          </Dialog>
        </li>
      ))}
    </ul>
  )
}
