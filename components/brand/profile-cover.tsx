import Image from "next/image"
import { NeatlineFrame } from "./neatline-frame"

/**
 * The strip across the top of a single profile, inside the neatline frame:
 * the owner's cover image, or navy with the cream banner centered.
 * 140px tall on mobile, 220px from lg.
 */
export function ProfileCover({ src, alt }: { src: string | null; alt: string }) {
  return (
    <NeatlineFrame className="h-[140px] lg:h-[220px]">
      {src ? (
        <Image src={src} alt={alt} fill priority sizes="(min-width: 1344px) 1296px, 100vw" className="object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center bg-navy">
          {/* 600x413 source at 60% of the strip's height, never stretched. */}
          <Image src="/brand/banner-cream.webp" alt="" width={600} height={413} className="h-[60%] w-auto" />
        </div>
      )}
    </NeatlineFrame>
  )
}
