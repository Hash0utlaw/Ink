"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DashboardNavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Match the path exactly instead of by prefix (for a dashboard's root). */
  exact?: boolean
}

// Phones: the active item has a red bottom edge. md+: a red left edge.
const ITEM =
  "flex min-h-11 items-center gap-2.5 whitespace-nowrap border-b-[3px] px-3 text-left text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:w-full md:border-b-0 md:border-l-[3px]"
const IDLE = "border-transparent text-ink-muted hover:bg-secondary hover:text-ink"

/**
 * Dashboard nav in a vellum panel. Phones: one row of tabs that scrolls
 * sideways, so the page starts right below it. md+: a side column.
 */
export function DashboardNav({ items, onSignOut }: { items: DashboardNavItem[]; onSignOut?: () => void }) {
  const pathname = usePathname()
  const activeRef = useRef<HTMLAnchorElement>(null)

  // Keeps the current tab in view in the phone row.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [pathname])

  return (
    <nav aria-label="Dashboard" className="rounded border-1.5 border-ink bg-vellum tex-vellum md:sticky md:top-20">
      <div className="scrollbar-ink flex overflow-x-auto p-1 md:block md:overflow-visible md:p-2">
        <ul className="flex gap-1 md:flex-col">
          {items.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  ref={active ? activeRef : undefined}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(ITEM, active ? "border-flash-red text-ink" : IDLE)}
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="ml-1 shrink-0 border-l border-rule pl-1 md:ml-0 md:mt-2 md:border-l-0 md:border-t md:pl-0 md:pt-2">
          <button type="button" onClick={onSignOut} className={cn(ITEM, IDLE)}>
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            Log out
          </button>
        </div>
      </div>
    </nav>
  )
}
