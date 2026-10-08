"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, Copy, Link2 } from "lucide-react"

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
    <Card className="bg-secondary border-ink">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-secondary p-2 shrink-0">
            <Link2 className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="font-semibold text-sm">Your booking link</p>
              <p className="text-xs text-muted-foreground">
                Share this in your Instagram bio to accept booking briefs without DMs.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                readOnly
                value={url}
                className="text-xs bg-background/60 font-mono h-8"
                onFocus={(e) => e.target.select()}
              />
              <Button
                size="sm"
                className={`shrink-0 gap-1.5 h-8 transition-colors ${copied ? "bg-success hover:bg-success/90" : "bg-primary hover:bg-primary/90"}`}
                onClick={copy}
              >
                {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
