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

  if (!show) return null

  return (
    <div className="w-full bg-card px-4 py-1.5 text-center text-xs font-medium text-foreground">
      Coming-soon mode is on — only admins can see the site.
    </div>
  )
}
