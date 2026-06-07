"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, ImageOff } from "lucide-react"
import type { ALL_STYLES } from "@/app/styles/page"

interface StyleCardProps {
  style: (typeof ALL_STYLES)[number]
}

/**
 * Individual style card used on the /styles browse page.
 * Client component so it can handle image load errors with a graceful fallback.
 */
export function StyleCard({ style }: StyleCardProps) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <Link href={`/styles/${style.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-xl aspect-[4/3] shadow-sm hover:shadow-xl transition-all duration-300 border border-border/60 bg-muted">
        {/* Hero image or fallback */}
        {imgFailed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted">
            <ImageOff className="w-8 h-8 opacity-30" />
            <span className="text-xs font-medium opacity-50">{style.name}</span>
          </div>
        ) : (
          <img
            src={style.heroImage}
            alt={`${style.name} tattoo style`}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        )}

        {/* Gradient overlay — shown even over fallback for consistent text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Tags top-left */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {style.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="bg-black/50 backdrop-blur-sm text-white/90 text-[10px] font-medium px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Arrow top-right on hover */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-primary rounded-full p-1.5">
            <ArrowRight className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
        </div>

        {/* Text bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="font-bold text-white text-xl mb-1 group-hover:text-primary/90 transition-colors">
            {style.name}
          </h3>
          <p className="text-white/70 text-xs leading-relaxed line-clamp-2">{style.description}</p>
        </div>
      </div>
    </Link>
  )
}
