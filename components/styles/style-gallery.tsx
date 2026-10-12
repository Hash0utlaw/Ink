"use client"

import { useState } from "react"
import { ImageOff } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface StyleGalleryProps {
  images: string[]
  styleName: string
}

// Fallback shown when an image fails to load
function ImageFallback({ label }: { label: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-vellum gap-2 text-ink-muted">
      <ImageOff className="w-6 h-6" aria-hidden="true" />
      <span className="text-[13px] text-center px-2 line-clamp-2">{label}</span>
    </div>
  )
}

export function StyleGallery({ images, styleName }: StyleGalleryProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  function handleError(src: string) {
    setFailedImages((prev) => new Set(prev).add(src))
  }

  return (
    // Framed tiles, no entrance animation, so images are always visible. Each
    // opens larger in a dialog (Escape closes it, focus returns to the tile).
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {images.map((src, i) => {
        const failed = failedImages.has(src)
        const tile = "relative block aspect-square w-full overflow-hidden border-1.5 border-ink bg-paper p-[5px]"
        if (failed) {
          return (
            <div key={src + i} className={tile}>
              <ImageFallback label={`${styleName} example ${i + 1}`} />
            </div>
          )
        }
        return (
          <Dialog key={src + i}>
            <DialogTrigger asChild>
              <button
                type="button"
                className={`${tile} cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                aria-label={`View ${styleName} example ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${styleName} tattoo example ${i + 1}`}
                  className="h-full w-full border border-ink object-cover"
                  loading={i < 4 ? "eager" : "lazy"}
                  onError={() => handleError(src)}
                />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl border-2 border-ink bg-vellum tex-vellum p-2 pt-14">
              <DialogTitle className="sr-only">{`${styleName} tattoo example ${i + 1}`}</DialogTitle>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${styleName} tattoo example ${i + 1}`}
                className="mx-auto max-h-[80vh] w-auto border border-ink object-contain"
              />
            </DialogContent>
          </Dialog>
        )
      })}
    </div>
  )
}
