import Image from "next/image"

/**
 * The strip across the top of a single profile, in a plain 2px ink border (the
 * striped neatline stays on the "Where to find" map, once per page): the owner's
 * cover image, or navy with the cream banner centered. 140px tall on mobile, 220px from lg.
 */
export function ProfileCover({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="relative h-[140px] overflow-hidden border-2 border-ink lg:h-[220px]">
      {src ? (
        <Image src={src} alt={alt} fill priority sizes="(min-width: 1344px) 1296px, 100vw" className="object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center bg-navy">
          {/* 600x413 source at 60% of the strip's height, never stretched. */}
          <Image src="/brand/banner-cream.webp" alt="" width={600} height={413} className="h-[60%] w-auto" />
        </div>
      )}
    </div>
  )
}
