import Image from "next/image"

/**
 * The strip across the top of a single profile, 150px tall on mobile, 260px from
 * lg, over a 3px ink bottom border. With an uploaded cover it shows the photo;
 * without one, the night chart with the cream banner near the top and a cream
 * hairline 7px above the bottom. The header plate overlaps its bottom edge.
 */
export function ProfileCover({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="relative h-[150px] overflow-hidden border-b-[3px] border-ink bg-night tex-night-chart lg:h-[260px]">
      {src ? (
        <Image src={src} alt={alt} fill priority sizes="(min-width: 1180px) 1132px, 100vw" className="object-cover" />
      ) : (
        <>
          {/* 1150x792 source; 78px tall on mobile, 132px from lg, never stretched. */}
          <Image
            src="/brand/banner-cream.webp"
            alt=""
            width={1150}
            height={792}
            priority
            className="absolute left-1/2 top-4 h-[78px] w-auto -translate-x-1/2 opacity-90 lg:top-6 lg:h-[132px]"
          />
          <span aria-hidden="true" className="absolute inset-x-0 bottom-[7px] h-px bg-cream/35" />
        </>
      )}
    </div>
  )
}
