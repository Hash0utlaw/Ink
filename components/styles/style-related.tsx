"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, ImageOff } from "lucide-react"
import { MotionView } from "@/components/utils/motion-view"
import type { ALL_STYLES } from "@/app/styles/page"

interface StyleRelatedProps {
  styles: (typeof ALL_STYLES)[number][]
}

export function StyleRelated({ styles }: StyleRelatedProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  function handleError(src: string) {
    setFailedImages((prev) => new Set(prev).add(src))
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {styles.map((style, i) => {
        const failed = failedImages.has(style.heroImage)
        return (
          <MotionView key={style.slug} delay={i * 0.08}>
            <Link
              href={`/styles/${style.slug}`}
              className="group flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 bg-card hover:bg-muted/30 transition-all"
            >
              <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                {failed ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                ) : (
                  <img
                    src={style.heroImage}
                    alt={style.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                    onError={() => handleError(style.heroImage)}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">{style.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{style.description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          </MotionView>
        )
      })}
    </div>
  )
}
