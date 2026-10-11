"use client"

import { useEffect, useState } from "react"
import { GATE_ADMIN_COOKIE } from "@/lib/launch-gate"

// Shown only when the middleware has flagged this visitor as an admin while
// the coming-soon gate is on (see middleware.ts).
export function AdminGateBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(document.cookie.split("; ").some((c) => c === `${GATE_ADMIN_COOKIE}=1`))
  }, [])

  // Full-height pages (/map) subtract this so the banner never adds a scroll.
  useEffect(() => {
    if (!show) return
    document.documentElement.style.setProperty("--admin-banner-h", "28px")
    return () => {
      document.documentElement.style.removeProperty("--admin-banner-h")
    }
  }, [show])

  if (!show) return null

  return (
    <div className="flex h-7 w-full items-center justify-center bg-vellum tex-vellum px-4 text-center text-xs font-medium text-foreground">
      Coming-soon mode is on — only admins can see the site.
    </div>
  )
}
