"use client"

import type { ReactNode } from "react"

/**
 * Jumps to the request form on this page and focuses its first field.
 * Without JavaScript the #request-form link still scrolls there.
 */
export function RequestIntroButton({ className, children }: { className?: string; children: ReactNode }) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const heading = document.getElementById("request-form")
    if (!heading) return
    e.preventDefault()
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    heading.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" })
    // The first field is gone once a request is sent; then only scroll.
    document.getElementById("booking-name")?.focus({ preventScroll: true })
  }

  return (
    <a href="#request-form" onClick={handleClick} className={className}>
      {children}
    </a>
  )
}
