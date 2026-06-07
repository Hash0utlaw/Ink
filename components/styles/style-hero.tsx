"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, ImageOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { ALL_STYLES } from "@/app/styles/page"

interface StyleHeroProps {
  style: (typeof ALL_STYLES)[number]
}

/**
 * Full-width hero for a style detail page.
 * Uses a plain <img> (not next/image) for reliability with local public assets,
 * and shows a graceful fallback if the image fails to load.
 */
export function StyleHero({ style }: StyleHeroProps) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <div
      className="relative w-full overflow-hidden bg-zinc-900"
      style={{ height: "clamp(280px, 40vh, 420px)" }}
    >
      {/* Background image */}
      {!imgFailed && (
        <img
          src={style.heroImage}
          alt={`${style.name} tattoo style`}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      )}

      {/* Fallback background pattern when image fails */}
      {imgFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900">
          <ImageOff className="w-12 h-12 text-white/20" />
          <span className="text-white/30 text-sm font-medium">{style.name}</span>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

      {/* Back link */}
      <div className="absolute top-5 left-5">
        <Link
          href="/styles"
          className="inline-flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white/90 hover:text-white text-sm font-medium px-3 py-1.5 rounded-full transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          All Styles
        </Link>
      </div>

      {/* Hero text */}
      <div className="absolute bottom-0 left-0 right-0 container mx-auto px-4 pb-8">
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge
            variant="outline"
            className="bg-black/40 backdrop-blur-sm border-white/20 text-white/80 text-xs"
          >
            {style.category}
          </Badge>
          {style.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="bg-black/40 backdrop-blur-sm border-white/20 text-white/80 text-xs"
            >
              {tag}
            </Badge>
          ))}
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-2">
          {style.name}
        </h1>
        <p className="text-white/75 text-base md:text-lg max-w-xl">{style.description}</p>
      </div>
    </div>
  )
}
