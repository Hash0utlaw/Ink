"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2, Loader2 } from "lucide-react"
import type { AvailabilityStatus, PriceTier } from "@/types/artist"

const AVAILABILITY_OPTIONS: { value: AvailabilityStatus; label: string; dot: string }[] = [
  { value: "available",          label: "Available now",       dot: "bg-green-500" },
  { value: "next_week",          label: "Available next week", dot: "bg-amber-400" },
  { value: "one_to_two_months",  label: "Booked 1–2 months",  dot: "bg-amber-400" },
  { value: "not_taking_clients", label: "Not taking clients",  dot: "bg-zinc-500"  },
]

const PRICE_OPTIONS: { value: PriceTier; label: string; sub: string }[] = [
  { value: "budget",  label: "$",    sub: "Under $100/hr" },
  { value: "mid",     label: "$$",   sub: "$100–$200/hr"  },
  { value: "premium", label: "$$$",  sub: "$200–$300/hr"  },
  { value: "luxury",  label: "$$$$", sub: "$300+/hr"      },
]

interface AvailabilitySettingsProps {
  initialAvailability: AvailabilityStatus
  initialPriceTier: PriceTier
  initialResponseHours: number | null
  initialDiscount: number | null
}

export function AvailabilitySettings({
  initialAvailability,
  initialPriceTier,
  initialResponseHours,
  initialDiscount,
}: AvailabilitySettingsProps) {
  const [availability, setAvailability] = useState<AvailabilityStatus>(initialAvailability)
  const [priceTier, setPriceTier] = useState<PriceTier>(initialPriceTier)
  const [responseHours, setResponseHours] = useState(initialResponseHours?.toString() ?? "")
  const [discount, setDiscount] = useState(initialDiscount?.toString() ?? "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/artist/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availability_status: availability,
          price_tier: priceTier,
          avg_response_hours: responseHours ? parseInt(responseHours) : null,
          first_booking_discount: discount ? parseInt(discount) : null,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        const json = await res.json()
        setError(json.error ?? "Save failed")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Availability status */}
      <div>
        <p className="text-sm font-medium mb-2">Availability</p>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABILITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAvailability(opt.value)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors ${
                availability === opt.value
                  ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dot}`} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price tier */}
      <div>
        <p className="text-sm font-medium mb-2">Price tier</p>
        <div className="grid grid-cols-4 gap-2">
          {PRICE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPriceTier(opt.value)}
              className={`flex flex-col items-center rounded-lg border px-2 py-3 transition-colors ${
                priceTier === opt.value
                  ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              <span className="text-base font-bold">{opt.label}</span>
              <span className="text-xs mt-0.5 text-center leading-tight">{opt.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Response time */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">Avg response time (hours)</label>
        <Input
          type="number"
          placeholder="e.g. 4"
          value={responseHours}
          onChange={(e) => setResponseHours(e.target.value)}
          min="1"
          max="168"
          className="max-w-xs"
        />
        <p className="text-xs text-muted-foreground mt-1">Shows as "Replies in ~4h" on your card</p>
      </div>

      {/* First-booking discount (Pro) */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">
          First-booking discount (%)
          <span className="ml-2 text-xs text-amber-400 font-normal">Pro</span>
        </label>
        <Input
          type="number"
          placeholder="e.g. 10"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          min="0"
          max="50"
          className="max-w-xs"
        />
        <p className="text-xs text-muted-foreground mt-1">Shows as "10% off first session" badge on artist cards</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        className="bg-[#7C3AED] hover:bg-[#6D28D9] gap-2"
        onClick={save}
        disabled={saving}
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
        ) : saved ? (
          <><CheckCircle2 className="w-4 h-4 text-green-400" />Saved!</>
        ) : (
          "Save availability"
        )}
      </Button>
    </div>
  )
}
