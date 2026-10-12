"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle2 } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { StyleSymbol } from "@/components/brand/style-symbol"
import { cn } from "@/lib/utils"

const LABEL = "mb-1.5 block text-sm font-semibold text-ink"
const CHIP =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border-1.5 border-ink px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const chipState = (on: boolean) => (on ? "bg-ink text-vellum" : "bg-vellum tex-vellum text-ink hover:bg-secondary")

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
        <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
        <p className="font-semibold">Listing added.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="flash-title" className={LABEL}>Title *</label>
        <Input id="flash-title" placeholder="e.g. Japanese Koi Fish" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <label htmlFor="flash-image" className={LABEL}>Image URL *</label>
        <Input id="flash-image" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        <p className="mt-1 text-[13px] text-ink-muted">Paste an image link (Instagram, Imgur, etc.)</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="flash-price" className={LABEL}>Price ($) *</label>
          <Input id="flash-price" type="number" placeholder="150" value={price} onChange={(e) => setPrice(e.target.value)} min="0" />
        </div>
        <div>
          <label htmlFor="flash-price-max" className={LABEL}>Max price ($)</label>
          <Input id="flash-price-max" type="number" placeholder="250" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} min="0" />
        </div>
      </div>

      <div>
        <p className={LABEL}>Style</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {STYLES.map((s) => (
            <button
              key={s.slug}
              type="button"
              aria-pressed={style === s.slug}
              onClick={() => setStyle(style === s.slug ? "" : s.slug)}
              className={cn(CHIP, "justify-start text-left leading-tight", chipState(style === s.slug))}
            >
              <StyleSymbol slug={s.slug} size={12} className="shrink-0" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className={LABEL}>Size</p>
        <div className="grid grid-cols-4 gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={size === s}
              onClick={() => setSize(size === s ? "" : s)}
              className={cn(CHIP, chipState(size === s))}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="flash-description" className={LABEL}>Description (optional)</label>
        <Textarea
          id="flash-description"
          placeholder="Any notes about the design, placement, etc."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          id="exclusive"
          checked={isExclusive}
          onChange={(e) => setIsExclusive(e.target.checked)}
          className="h-5 w-5 accent-ink"
        />
        <label htmlFor="exclusive" className="cursor-pointer text-sm text-ink">
          Exclusive: only one client can book this design
        </label>
      </div>

      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}

      <Button
        type="submit"
        className="w-full"
        disabled={!title || !imageUrl || !price || submitting}
      >
        {submitting ? <><Loader2 className="animate-spin" aria-hidden="true" />Adding…</> : "Add listing"}
      </Button>
    </form>
  )
}
