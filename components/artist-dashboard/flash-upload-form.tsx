"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle2 } from "lucide-react"

const STYLES = ["Traditional", "Neo-Traditional", "Japanese", "Blackwork", "Fine Line", "Realism", "Watercolor", "Geometric", "Other"]
const SIZES = ["Tiny", "Small", "Medium", "Large"]

export function FlashUploadForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [price, setPrice] = useState("")
  const [priceMax, setPriceMax] = useState("")
  const [style, setStyle] = useState("")
  const [size, setSize] = useState("")
  const [isExclusive, setIsExclusive] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !imageUrl || !price) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/flash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          imageUrl,
          price: parseFloat(price),
          priceMax: priceMax ? parseFloat(priceMax) : null,
          style: style || null,
          size: size || null,
          isExclusive,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Something went wrong")
      } else {
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          setTitle(""); setDescription(""); setImageUrl(""); setPrice("")
          setPriceMax(""); setStyle(""); setSize(""); setIsExclusive(false)
          router.refresh()
        }, 1500)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="py-8 flex flex-col items-center gap-2 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
        <p className="font-semibold">Listing added!</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs font-medium mb-1 block">Title *</label>
        <Input placeholder="e.g. Japanese Koi Fish" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <label className="text-xs font-medium mb-1 block">Image URL *</label>
        <Input placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        <p className="text-xs text-muted-foreground mt-1">Paste an image link (Instagram, Imgur, etc.)</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium mb-1 block">Price ($) *</label>
          <Input type="number" placeholder="150" value={price} onChange={(e) => setPrice(e.target.value)} min="0" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Max price ($)</label>
          <Input type="number" placeholder="250" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} min="0" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium mb-1 block">Style</label>
        <div className="grid grid-cols-3 gap-1.5">
          {STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStyle(style === s ? "" : s)}
              className={`rounded-md border px-1.5 py-1 text-xs font-medium transition-colors ${
                style === s ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium mb-1 block">Size</label>
        <div className="grid grid-cols-4 gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(size === s ? "" : s)}
              className={`rounded-md border px-1.5 py-1 text-xs font-medium transition-colors ${
                size === s ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium mb-1 block">Description (optional)</label>
        <Textarea
          placeholder="Any notes about the design, placement, etc."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="exclusive"
          checked={isExclusive}
          onChange={(e) => setIsExclusive(e.target.checked)}
          className="accent-[#7C3AED]"
        />
        <label htmlFor="exclusive" className="text-xs text-muted-foreground cursor-pointer">
          Exclusive — only one client can book this design
        </label>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <Button
        type="submit"
        className="w-full bg-[#7C3AED] hover:bg-[#6D28D9]"
        disabled={!title || !imageUrl || !price || submitting}
      >
        {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : "Add Listing"}
      </Button>
    </form>
  )
}
