"use client"

import { useEffect, useId, useState, type ReactNode } from "react"
import { SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"

const PRIMARY =
  "min-h-11 w-full rounded border-1.5 border-ink bg-flash-red px-5 text-[15px] font-semibold text-white hover:bg-flash-red/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

interface FilterDrawerProps {
  /** e.g. "Show 79 results"; null while results load. */
  resultLabel: string | null
  activeCount: number
  children: ReactNode
}

/**
 * The filters: a sidebar from lg up; below that a "Filters" button opens them
 * in a full-height sheet with a "Show {n} results" button. The filters render
 * once, so their own state survives opening and closing the sheet.
 */
export function FilterDrawer({ resultLabel, activeCount, children }: FilterDrawerProps) {
  const [open, setOpen] = useState(false)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    const { overflow } = document.body.style
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-2 rounded border-1.5 border-ink bg-vellum tex-vellum px-4 text-[15px] font-semibold text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        Filters
        {activeCount > 0 && <span className="tabular-nums">({activeCount})</span>}
      </button>

      <div
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-labelledby={open ? titleId : undefined}
        className={cn(
          open ? "fixed inset-0 z-50 flex flex-col bg-paper tex-paper" : "hidden",
          "lg:static lg:z-auto lg:block lg:bg-transparent",
        )}
      >
        <div className="flex items-center justify-between border-b-1.5 border-ink px-4 py-3 lg:hidden">
          <h2 id={titleId} className="font-heading text-[22px] text-ink">
            Filters
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close filters"
            className="inline-flex h-11 w-11 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5 lg:overflow-visible lg:p-0">{children}</div>
        <div className="border-t-1.5 border-ink px-4 py-3 lg:hidden">
          <button type="button" onClick={() => setOpen(false)} className={PRIMARY}>
            {resultLabel ?? "Show results"}
          </button>
        </div>
      </div>
    </>
  )
}
