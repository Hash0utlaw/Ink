import type { ReactNode } from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

// Shared look for the auth cards (login, sign up, forgot and reset password).
// The submit button is the only red element on these pages.

/** Flat vellum input with an ink outline; labels sit above. */
export const AUTH_INPUT =
  "h-11 rounded-lg border-1.5 border-ink bg-vellum text-base text-ink placeholder:text-ink-muted/70"
export const AUTH_LABEL = "text-[15px] font-semibold text-ink"
export const AUTH_SUBMIT =
  "h-auto min-h-11 w-full rounded-lg border-1.5 border-ink bg-flash-red text-[15px] font-semibold text-white hover:bg-flash-red/90"
export const AUTH_SECONDARY =
  "h-auto min-h-11 rounded-lg border-1.5 border-ink bg-vellum tex-vellum text-[15px] font-semibold text-ink hover:bg-secondary hover:text-ink"
export const AUTH_HEADING = "font-heading text-[30px] leading-[1.1] text-ink text-balance"
export const AUTH_INTRO = "mt-2 text-[15px] leading-[1.55] text-ink-muted text-pretty"
export const AUTH_LINK = "font-semibold text-navy underline underline-offset-2 hover:no-underline"
/** Icon tile above a heading: ink outline on paper, never red. */
export const AUTH_ICON_TILE = "flex h-14 w-14 items-center justify-center rounded-lg border-1.5 border-ink bg-paper"

/** An error (warning token) or success (success token) message. */
export function AuthNotice({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border-1.5 border-ink p-3.5 text-[15px] leading-[1.45]",
        tone === "success" ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
