"use client"

import { useState } from "react"
import { X, ZoomIn, ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface StyleGalleryProps {
  images: string[]
  styleName: string
}

// Fallback shown when an image fails to load
function ImageFallback({ label }: { label: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-muted gap-2 text-muted-foreground">
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
      {/* Grid — no MotionView wrappers so images are always visible in the DOM */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((src, i) => {
          const failed = failedImages.has(src)
          return (
            <button
              key={src + i}
              type="button"
              className="group relative overflow-hidden rounded-xl aspect-square cursor-zoom-in w-full block border border-border/50 hover:border-primary/40 transition-colors bg-muted"
              onClick={() => !failed && setLightboxSrc(src)}
              aria-label={`View ${styleName} example ${i + 1}`}
            >
              {failed ? (
                <ImageFallback label={`${styleName} example ${i + 1}`} />
              ) : (
                <>
                  <img
                    src={src}
                    alt={`${styleName} tattoo example ${i + 1}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading={i < 4 ? "eager" : "lazy"}
                    onError={() => handleError(src)}
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
            onClick={() => setLightboxSrc(null)}
            aria-label="Close lightbox"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxSrc}
            alt="Selected tattoo example"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
