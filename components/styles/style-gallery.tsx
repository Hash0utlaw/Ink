"use client"

import { useState } from "react"
import { X, ZoomIn } from "lucide-react"
import { MotionView } from "@/components/utils/motion-view"
import { cn } from "@/lib/utils"

interface StyleGalleryProps {
  images: string[]
  styleName: string
}

export function StyleGallery({ images, styleName }: StyleGalleryProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((src, i) => (
          <MotionView key={src + i} delay={i * 0.04}>
            <button
              type="button"
              className="group relative overflow-hidden rounded-xl aspect-square cursor-zoom-in w-full block border border-border/50 hover:border-primary/40 transition-colors"
              onClick={() => setLightboxSrc(src)}
              aria-label={`View ${styleName} example ${i + 1}`}
            >
              <img
                src={src}
                alt={`${styleName} tattoo example ${i + 1}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                <ZoomIn
                  className={cn(
                    "w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                  )}
                />
              </div>
            </button>
          </MotionView>
        ))}
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
