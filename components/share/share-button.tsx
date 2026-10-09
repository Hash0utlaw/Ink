"use client"

import { Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

/** Shares this page: the native share sheet when there is one, else copies the URL. */
export function ShareButton({ name, title, className }: { name: string; title: string; className?: string }) {
  const { toast } = useToast()

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        // Closing the share sheet rejects; nothing to do.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast({ description: "Link copied" })
    } catch {
      toast({ description: "Couldn't copy the link", variant: "destructive" })
    }
  }

  return (
    <Button type="button" variant="outline" size="icon" aria-label={`Share ${name}`} onClick={handleShare} className={className}>
      <Share2 className="h-4 w-4" />
    </Button>
  )
}
