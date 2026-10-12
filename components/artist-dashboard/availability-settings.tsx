"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AvailabilityStatus } from "@/types/artist"

// Price tier, average response time and first-session discount are not shown
// on any public page yet, so their fields are hidden; the columns stay as they are.

const AVAILABILITY_OPTIONS: { value: AvailabilityStatus; label: string; dot: string }[] = [
  { value: "available",          label: "Available now",       dot: "bg-success" },
  { value: "next_week",          label: "Available next week", dot: "bg-warning" },
  { value: "one_to_two_months",  label: "Booked 1–2 months",   dot: "bg-warning" },
  { value: "not_taking_clients", label: "Not taking clients",  dot: "bg-ink-muted" },
]

interface AvailabilitySettingsProps {
  initialAvailability: AvailabilityStatus
}

export function AvailabilitySettings({ initialAvailability }: AvailabilitySettingsProps) {
  const [availability, setAvailability] = useState<AvailabilityStatus>(initialAvailability)
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
        body: JSON.stringify({ availability_status: availability }),
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
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Availability</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {AVAILABILITY_OPTIONS.map((opt) => {
            const on = availability === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={on}
                onClick={() => setAvailability(opt.value)}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded border-1.5 border-ink px-3 text-left text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  on ? "bg-ink text-vellum" : "bg-vellum tex-vellum text-ink hover:bg-secondary",
                )}
              >
                <span className={cn("h-2.5 w-2.5 shrink-0 border-1.5", on ? "border-vellum" : "border-ink", opt.dot)} />
                {opt.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            "Save availability"
          )}
        </Button>
        <span aria-live="polite" className="text-sm font-semibold text-success">
          {saved ? "Saved" : ""}
        </span>
      </div>
    </div>
  )
}
