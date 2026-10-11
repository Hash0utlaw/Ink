import Link from "next/link"
import { cn } from "@/lib/utils"

const CONTROL =
  "inline-flex min-h-11 items-center rounded-lg border-1.5 border-ink bg-vellum tex-vellum px-4 text-[15px] font-semibold text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const DISABLED = "pointer-events-none border-rule text-ink-muted"

interface PaginationProps {
  /** Zero-based. */
  page: number
  totalPages: number
  /** Client-side paging (button). */
  onPageChange?: (page: number) => void
  /** Server-rendered paging (link). */
  hrefFor?: (page: number) => string
}

/** "Previous / Page 2 of 4 / Next". Renders nothing for a single page. */
export function Pagination({ page, totalPages, onPageChange, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null

  const control = (target: number, label: string, disabled: boolean) => {
    if (disabled) {
      return (
        <span className={cn(CONTROL, DISABLED)} aria-disabled="true">
          {label}
        </span>
      )
    }
    if (hrefFor) {
      return (
        <Link href={hrefFor(target)} className={CONTROL} rel={label === "Next" ? "next" : "prev"}>
          {label}
        </Link>
      )
    }
    return (
      <button
        type="button"
        className={CONTROL}
        onClick={() => {
          onPageChange?.(target)
          window.scrollTo({ top: 0 })
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3">
      {control(page - 1, "Previous", page <= 0)}
      <span className="px-1 text-[15px] tabular-nums text-ink">
        Page {page + 1} of {totalPages.toLocaleString("en-US")}
      </span>
      {control(page + 1, "Next", page >= totalPages - 1)}
    </nav>
  )
}
