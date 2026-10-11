import Image from "next/image"

/**
 * The strip across the top of a single profile, in a plain 2px ink border: the
 * owner's uploaded cover image, 140px tall on mobile, 220px from lg. Nothing at
 * all when there's no cover (the header then sits on paper).
 */
export function ProfileCover({ src, alt }: { src: string | null; alt: string }) {
  if (!src) return null
  return (
    <div className="relative h-[140px] overflow-hidden border-2 border-ink lg:h-[220px]">
      <Image src={src} alt={alt} fill priority sizes="(min-width: 1344px) 1296px, 100vw" className="object-cover" />
    </div>
  )
}
