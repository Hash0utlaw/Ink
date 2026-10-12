"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { StyleBadge } from "@/components/brand/style-badge"
import { styleLabel } from "@/lib/styles"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Trash2, Loader2, Sparkles } from "lucide-react"
import type { FlashListing } from "@/lib/supabase/flash"
import { safeImageSrc } from "@/lib/utils/safe-image"

interface FlashManageCardProps {
  listing: FlashListing
}

export function FlashManageCard({ listing }: FlashManageCardProps) {
  const router = useRouter()
  const [available, setAvailable] = useState(listing.isAvailable)
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function toggleAvailable(val: boolean) {
    setToggling(true)
    setAvailable(val)
    try {
      await fetch(`/api/flash/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: val }),
      })
      router.refresh()
    } finally {
      setToggling(false)
    }
  }

  async function deleteListing() {
    if (!confirm("Delete this flash listing?")) return
    setDeleting(true)
    try {
      await fetch(`/api/flash/${listing.id}`, { method: "DELETE" })
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex gap-3 rounded-lg border-1.5 border-ink bg-vellum tex-vellum p-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden border-1.5 border-ink bg-paper">
        <Image src={safeImageSrc(listing.imageUrl)} alt={listing.title} fill className="object-cover" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-semibold">{listing.title}</p>
          {listing.isExclusive && (
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-flash-red" aria-label="Exclusive" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold tabular-nums">
            ${listing.price}{listing.priceMax ? `–$${listing.priceMax}` : ""}
          </span>
          {listing.style && <StyleBadge slug={listing.style} label={styleLabel(listing.style) ?? listing.style} />}
          {listing.size && <Badge variant="outline">{listing.size}</Badge>}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Switch
            checked={available}
            onCheckedChange={toggleAvailable}
            disabled={toggling}
            aria-label="Show this listing on the Flash page"
          />
          <span className="text-sm text-ink-muted">
            {toggling ? "Saving..." : available ? "Available" : "Hidden"}
          </span>
        </div>
      </div>

      <Button
        size="icon"
        variant="ghost"
        aria-label="Delete listing"
        className="shrink-0 text-ink-muted hover:text-destructive"
        onClick={deleteListing}
        disabled={deleting}
      >
        {deleting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
      </Button>
    </div>
  )
}
