"use client"

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

const ITEM =
  "flex min-h-11 w-full items-center gap-2.5 border-l-[3px] px-3 text-left text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const IDLE = "border-transparent text-ink-muted hover:bg-secondary hover:text-ink"

/** Dashboard side nav: vellum panel, the active item marked by a red left edge. Two columns on phones. */
export function DashboardNav({ items, onSignOut }: { items: DashboardNavItem[]; onSignOut?: () => void }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Dashboard" className="rounded border-1.5 border-ink bg-vellum tex-vellum p-2 md:sticky md:top-20">
      <ul className="grid grid-cols-2 gap-1 md:grid-cols-1">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <li key={item.href}>
              <Link
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
      <div className="mt-2 border-t border-rule pt-2">
        <button type="button" onClick={onSignOut} className={cn(ITEM, IDLE)}>
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          Log out
        </button>
      </div>
    </nav>
  )
}
