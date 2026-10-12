import type { Metadata } from "next"
import Image from "next/image"
import { SUPPORT_EMAIL } from "@/lib/site-config"
import { getRoundedListedCounts } from "@/lib/supabase/sitemap"

// Live counts, refreshed hourly.
export const revalidate = 3600

const DESCRIPTION = "TattooMaps is almost ready. Tattoo shops and artists across the U.S., searchable by place and style."

export const metadata: Metadata = {
  title: "TattooMaps — Coming soon",
  description: DESCRIPTION,
  robots: { index: false, follow: false },
}

// Standalone pre-launch page: no site header, footer or nav. The middleware
// rewrites every gated request here (see lib/launch-gate.ts).
export default async function ComingSoonPage() {
  const counts = await getRoundedListedCounts()
  const what = counts
    ? `${counts.shops} shops and ${counts.artists} artists in the U.S.`
    : "Tattoo shops and artists across the U.S."

  return (
    <div className="flex min-h-[100svh] flex-col bg-paper tex-paper text-ink">
      {/* Phones 36svh (200-280px), tablets 45svh (max 380px), desktop 50svh (300-460px). */}
      <div className="flex h-[36svh] max-h-[280px] min-h-[200px] items-center justify-center bg-night tex-night-chart px-6 sm:h-[45svh] sm:max-h-[380px] lg:h-[50svh] lg:max-h-[460px] lg:min-h-[300px]">
        <Image
          src="/brand/banner-cream.webp"
          alt="TattooMaps"
          width={600}
          height={413}
          priority
          className="h-24 w-auto sm:h-[140px] lg:h-[170px]"
        />
      </div>

      <main className="flex flex-1 items-center justify-center px-6 py-8 sm:py-10">
        <div className="w-full max-w-[560px] text-center">
          <h1 className="font-heading text-[34px] font-normal leading-[1.1] text-balance sm:text-[40px] lg:text-[48px]">
            Find a tattoo artist near you.
          </h1>
          <p className="mx-auto mt-4 max-w-[34ch] text-base leading-[1.55] text-pretty lg:text-[17px]">
            TattooMaps is almost ready. {what}, searchable by place and style.
          </p>
          <p className="mt-4 text-sm text-ink-muted">
            Artist or shop owner? Email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-navy underline underline-offset-2 hover:no-underline">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </div>
      </main>

      <footer className="flex justify-center border-t-3 border-ink bg-night tex-night px-6 py-6">
        <Image src="/brand/logo-wordmark-cream.webp" alt="TattooMaps" width={83} height={48} className="h-12 w-auto" />
      </footer>
    </div>
  )
}
