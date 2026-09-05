"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import type { SavedItemType } from "@/lib/supabase/saved"

interface SaveButtonProps {
  itemType: SavedItemType
  itemId: string
  variant?: "icon" | "full"
  initialSaved?: boolean
  className?: string
}

export function SaveButton({
  itemType,
  itemId,
  variant = "icon",
  initialSaved = false,
  className,
}: SaveButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [saved, setSaved] = useState(initialSaved)
  const [pending, setPending] = useState(false)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (pending) return

    const nextSaved = !saved
    setSaved(nextSaved)
    setPending(true)

    try {
      const res = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId }),
      })

      if (res.status === 401) {
        setSaved(saved)
        toast({
          description: `Sign in to save ${itemType === "artist" ? "artists" : "shops"}`,
          action: (
            <ToastAction
              altText="Sign in"
              onClick={() => router.push(`/login?next=${encodeURIComponent(pathname)}`)}
            >
              Sign in
            </ToastAction>
          ),
        })
        return
      }

      const data = await res.json()
      if (!res.ok || !data.success) {
        setSaved(saved)
        toast({ description: "Something went wrong. Please try again.", variant: "destructive" })
        return
      }

      setSaved(Boolean(data.saved))
    } catch {
      setSaved(saved)
      toast({ description: "Something went wrong. Please try again.", variant: "destructive" })
    } finally {
      setPending(false)
    }
  }

  if (variant === "full") {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={pending}
        className={className}
        aria-pressed={saved}
      >
        <Heart className={cn("h-4 w-4", saved && "fill-accent text-accent")} />
        {saved ? "Saved" : "Save"}
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save"}
      className={cn("h-11 w-11 bg-background/80 backdrop-blur-sm", className)}
    >
      <Heart className={cn("h-4 w-4", saved && "fill-accent text-accent")} />
    </Button>
  )
}
