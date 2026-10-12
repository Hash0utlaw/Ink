import { forwardRef, type ReactNode } from "react"
import Link from "next/link"
import { NeatlineFrame } from "@/components/brand/neatline-frame"

// Shared pieces of the artist finder (Round 9 boards: Step 1, Step 2, Results).

export const PRIMARY_BUTTON =
  "inline-flex min-h-[52px] items-center justify-center rounded border-1.5 border-ink bg-flash-red px-[30px] text-base font-semibold text-white hover:bg-flash-red/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
export const SECONDARY_BUTTON =
  "inline-flex min-h-[52px] items-center justify-center gap-2 rounded border-1.5 border-ink bg-vellum tex-vellum px-[22px] text-base font-semibold text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
export const TEXT_LINK = "font-semibold text-navy underline underline-offset-2 hover:no-underline"

/** "Artist finder" kicker, the page's h1 and the one-line promise. */
export const FinderIntro = forwardRef<HTMLHeadingElement>(function FinderIntro(_, ref) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="font-place text-[20px] italic">Artist finder</span>
      <h1
        ref={ref}
        tabIndex={-1}
        className="font-heading text-[38px] leading-[1.05] text-balance focus:outline-none sm:text-[54px]"
      >
        Find an artist near you
      </h1>
      <p className="max-w-[520px] text-[17px] leading-[1.55] text-ink-muted text-pretty">
        Two questions. We show every artist who fits, nearest first.
      </p>
    </div>
  )
})

/** The step card: the neatline frame, "Step n of 2" and the two-segment bar. */
export function StepFrame({ step, name, children }: { step: 1 | 2; name: string; children: ReactNode }) {
  return (
    <NeatlineFrame className="bg-paper tex-paper">
      <div className="flex flex-col gap-[22px] bg-vellum tex-vellum p-5 sm:p-8">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm font-semibold">
            <span>Step {step} of 2</span>
            <span className="font-medium text-ink-muted">{name}</span>
          </div>
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-1.5 flex-1 border-1.5 border-ink bg-ink" />
            <span className={`h-1.5 flex-1 border-1.5 border-ink ${step === 2 ? "bg-ink" : "bg-vellum"}`} />
          </div>
        </div>
        {children}
      </div>
    </NeatlineFrame>
  )
}

/** "Already know who you want? Browse all artists", under the card. */
export function BrowseAllLine() {
  return (
    <p className="text-center text-[15px] text-ink-muted">
      Already know who you want?{" "}
      <Link href="/artists" className={`inline-flex min-h-11 items-center ${TEXT_LINK}`}>
        Browse all artists
      </Link>
    </p>
  )
}
