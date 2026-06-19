"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Trash2, Loader2, Sparkles } from "lucide-react"
import type { FlashListing } from "@/lib/supabase/flash"

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
    <div className="flex gap-3 p-3 border rounded-lg bg-card">
      <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
        <Image src={listing.imageUrl} alt={listing.title} fill className="object-cover" unoptimized />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm truncate">{listing.title}</p>
          {listing.isExclusive && (
            <Sparkles className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          <span className="text-sm font-bold">
            ${listing.price}{listing.priceMax ? `–$${listing.priceMax}` : ""}
          </span>
          {listing.style && <Badge variant="secondary" className="text-xs">{listing.style}</Badge>}
          {listing.size && <Badge variant="outline" className="text-xs">{listing.size}</Badge>}
        </div>
        <div className="flex items-center gap-2 pt-0.5">
          <Switch
            checked={available}
            onCheckedChange={toggleAvailable}
            disabled={toggling}
            className="scale-75 -ml-1"
          />
          <span className="text-xs text-muted-foreground">
            {toggling ? "Saving..." : available ? "Available" : "Hidden"}
          </span>
        </div>
      </div>

      <Button
        size="icon"
        variant="ghost"
        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-red-500"
        onClick={deleteListing}
        disabled={deleting}
      >
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </Button>
    </div>
  )
}
