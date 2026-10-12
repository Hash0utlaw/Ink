"use client"

import { useState } from "react"
import { X, ImageOff } from "lucide-react"

interface StyleGalleryProps {
  images: string[]
  styleName: string
}

// Fallback shown when an image fails to load
function ImageFallback({ label }: { label: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-vellum gap-2 text-ink-muted">
      <ImageOff className="w-6 h-6 opacity-40" />
      <span className="text-[10px] text-center px-2 line-clamp-2 opacity-60">{label}</span>
    </div>
  )
}

export function StyleGallery({ images, styleName }: StyleGalleryProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  function handleError(src: string) {
    setFailedImages((prev) => new Set(prev).add(src))
  }

  return (
    <>
      {/* Framed tiles, no entrance animation, so images are always visible. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((src, i) => {
          const failed = failedImages.has(src)
          return (
            <button
              key={src + i}
              type="button"
              className="relative block aspect-square w-full cursor-zoom-in overflow-hidden border-1.5 border-ink bg-paper p-[5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => !failed && setLightboxSrc(src)}
              aria-label={`View ${styleName} example ${i + 1}`}
            >
              {failed ? (
                <ImageFallback label={`${styleName} example ${i + 1}`} />
              ) : (
                <img
                  src={src}
                  alt={`${styleName} tattoo example ${i + 1}`}
                  className="h-full w-full border border-ink object-cover"
                  loading={i < 4 ? "eager" : "lazy"}
                  onError={() => handleError(src)}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-night/95 p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded border-1.5 border-cream text-cream hover:bg-cream hover:text-night"
            onClick={() => setLightboxSrc(null)}
            aria-label="Close lightbox"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxSrc}
            alt="Selected tattoo example"
            className="max-h-[90vh] max-w-[90vw] border-2 border-ink object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
