"use client"

import { useState } from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plate } from "@/components/brand/plate"
import { cn } from "@/lib/utils"

/** A portfolio photo: a URL, or a URL with its caption and (for uploads) its id for reports. */
export type PortfolioImage = string | { src: string; caption?: string | null; id?: string }

/** /contact with the topic set to "Report a photo" and the photo's id in the message. */
export function reportPhotoHref(photoId: string, pagePath?: string): string {
  const message = `Photo ID: ${photoId}${pagePath ? `\nPage: ${pagePath}` : ""}\n\nWhat's wrong with this photo:\n`
  return `/contact?${new URLSearchParams({ topic: "Report a photo", message })}`
}

interface PortfolioGalleryProps {
  images: PortfolioImage[]
  name: string
  /** Phones show this many, then "See all N photos". */
  phoneLimit?: number
  /** The page the photos are on, added to report messages. */
  pagePath?: string
}

/**
 * Real portfolio photos as framed plates (4:5, 1.5px ink, 5px paper gap, 1px ink
 * inner line), 2 across, 4 from md; each opens larger. A caption shows only when
 * the photo has one. Callers pass only loadable URLs.
 */
export function PortfolioGallery({ images, name, phoneLimit, pagePath }: PortfolioGalleryProps) {
  const [showAll, setShowAll] = useState(false)
  const limited = phoneLimit != null && images.length > phoneLimit && !showAll

  return (
    <div>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {images.map((image, i) => {
          const { src, caption, id } = typeof image === "string" ? { src: image, caption: null, id: undefined } : image
          const alt = caption || `Portfolio piece ${i + 1} by ${name}`
          return (
            <li key={src} className={cn(limited && i >= phoneLimit && "max-md:hidden")}>
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
                  {(caption || id) && (
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1 pb-1">
                      {caption ? <p className="text-[15px] text-ink text-pretty">{caption}</p> : <span />}
                      {id && (
                        <Link
                          href={reportPhotoHref(id, pagePath)}
                          className="inline-flex min-h-11 items-center text-[13px] font-semibold text-navy underline underline-offset-2 hover:no-underline"
                        >
                          Report this photo
                        </Link>
                      )}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </li>
          )
        })}
      </ul>
      {limited && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-4 inline-flex min-h-11 items-center text-[15px] font-semibold text-navy underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          See all {images.length} photos
        </button>
      )}
    </div>
  )
}
