"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, Copy } from "lucide-react"

interface ShareBookingLinkProps {
  handle: string
}

export function ShareBookingLink({ handle }: ShareBookingLinkProps) {
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState(`/book/${handle}`)

  useEffect(() => {
    setUrl(`${window.location.origin}/book/${handle}`)
  }, [handle])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select the input
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[15px] font-semibold text-ink">Your booking link</p>
        <p className="text-sm text-ink-muted">
          Share this in your Instagram bio to accept booking briefs without DMs.
        </p>
      </div>
      <div className="flex gap-2">
        <Input
          readOnly
          aria-label="Your booking link"
          value={url}
          className="h-11 min-w-0 flex-1"
          onFocus={(e) => e.target.select()}
        />
        <Button variant="secondary" className="shrink-0" onClick={copy}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
    </div>
  )
}
