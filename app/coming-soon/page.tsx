import { existsSync } from "node:fs"
import path from "node:path"
import type { Metadata } from "next"
import Image from "next/image"
import localFont from "next/font/local"

// Figtree (latin, 400/500/800) is stored in app/fonts so builds never fetch from Google Fonts.
const figtree = localFont({
  src: [
    { path: "../fonts/figtree-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/figtree-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/figtree-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
})

const SUBLINE =
  "Find artists by style and city, see who works where, and request your next piece. We're putting on the finishing touches."

// Use the brand wordmark when it's been added to public/brand; otherwise text.
const HAS_WORDMARK = existsSync(path.join(process.cwd(), "public/brand/logo-wordmark-color.png"))

const STATS = ["26,000+ shops", "21,000+ artists", "All 50 states"]

export const metadata: Metadata = {
  title: "TattooMaps — Coming soon",
  description: SUBLINE,
  robots: { index: false, follow: false },
}

// Standalone pre-launch page: no site header, footer or nav. The middleware
// rewrites every gated request here (see lib/launch-gate.ts).
export default function ComingSoonPage() {
  return (
    <div className={`${figtree.className} flex min-h-screen flex-col bg-[#FBF7EE] text-[#1A1A1A]`}>
      <main className="flex flex-1 items-center justify-center px-6 py-16 sm:py-24">
        <div className="w-full max-w-[640px] text-center">
          {HAS_WORDMARK ? (
            <Image
              src="/brand/logo-wordmark-color.png"
              alt="TattooMaps"
              width={600}
              height={346}
              priority
              className="mx-auto h-20 w-auto sm:h-[110px]"
            />
          ) : (
            <p className="text-4xl font-extrabold tracking-tight sm:text-5xl">TattooMaps</p>
          )}

          <p className="mt-10 text-sm font-medium uppercase tracking-[0.2em] text-[#B3261E]">Coming soon</p>

          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Every tattoo shop in America, on one map.
          </h1>

          <p className="mx-auto mt-6 max-w-[34rem] text-lg leading-relaxed text-[#1A1A1A]/80 sm:text-xl">{SUBLINE}</p>

          <ul className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-0">
            {STATS.map((stat, i) => (
              <li key={stat} className="flex items-center text-lg font-medium text-[#1F4E79]">
                {i > 0 && (
                  <span aria-hidden="true" className="mx-4 hidden text-[#1A1A1A]/40 sm:inline">
                    ·
                  </span>
                )}
                {stat}
              </li>
            ))}
          </ul>
        </div>
      </main>

      <footer className="px-6 pb-10 text-center text-sm text-[#1A1A1A]/75">
        © {new Date().getFullYear()} TattooMaps · Questions?{" "}
        <a href="mailto:support@tattoomaps.com" className="font-medium text-[#1F4E79] underline underline-offset-2">
          support@tattoomaps.com
        </a>
      </footer>
    </div>
  )
}
