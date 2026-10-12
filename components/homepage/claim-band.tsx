import Image from "next/image"
import Link from "next/link"

export function ClaimBand() {
  return (
    <section aria-labelledby="claim-heading" className="w-full border-y-3 border-ink bg-night tex-night-chart">
      <div className="mx-auto flex w-full max-w-[1344px] flex-col items-start gap-6 px-6 py-12 md:flex-row md:items-center md:gap-10 md:py-14">
        <Image
          src="/brand/banner-cream.webp"
          alt=""
          width={190}
          height={131}
          className="h-auto w-[190px] shrink-0"
        />
        <div className="max-w-[60ch] flex-1">
          <h2 id="claim-heading" className="text-[30px] leading-[1.15] text-cream md:text-[34px]">
            Is your shop already on the map?
          </h2>
          <p className="mt-3 text-pretty text-base leading-[1.55] text-cream">
            Most shops and artists are listed. Claim your page for free to add your work, set your styles and answer requests.
          </p>
        </div>
        <Link
          href="/claim"
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded border-1.5 border-cream bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-night"
        >
          Claim your page
        </Link>
      </div>
    </section>
  )
}
