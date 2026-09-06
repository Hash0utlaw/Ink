"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react"

interface Prefill {
  description?: string
  style?: string
  size?: string
}

interface PublicBookingFormProps {
  artistId: string
  artistName: string
  prefill?: Prefill
}

const SIZE_OPTIONS = ["Small", "Medium", "Large", "Full Sleeve"]
const STYLE_OPTIONS = ["Traditional", "Neo-Traditional", "Japanese", "Blackwork", "Fine Line", "Realism", "Watercolor", "Geometric", "Other"]
const BUDGET_OPTIONS = ["Under $200", "$200–$500", "$500–$1,000", "$1,000+"]

export function PublicBookingForm({ artistId, artistName, prefill }: PublicBookingFormProps) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [date, setDate] = useState("")
  const [description, setDescription] = useState(prefill?.description ?? "")
  const [size, setSize] = useState(prefill?.size ?? "")
  const [placement, setPlacement] = useState("")
  const [style, setStyle] = useState(prefill?.style ?? "")
  const [budget, setBudget] = useState("")

  async function handleSubmit() {
    if (!name || !email || !description) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId,
          clientName: name,
          clientEmail: email,
          clientPhone: phone || null,
          preferredDate: date || null,
          description,
          size: size || null,
          placement: placement || null,
          style: style || null,
          budget: budget || null,
        }),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        setError("Something went wrong. Please try again.")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h3 className="text-xl font-bold">Request Sent!</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          {artistName} will review your brief and respond within 24 hours.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step > s ? "bg-green-500 text-white" : step === s ? "bg-[#7C3AED] text-white" : "bg-muted text-muted-foreground"
            }`}>{s}</div>
            {s < 3 && <div className={`h-px flex-1 w-8 ${step > s ? "bg-green-500" : "bg-border"}`} />}
          </div>
        ))}
        <span className="text-xs text-muted-foreground ml-2">
          {step === 1 ? "Your idea" : step === 2 ? "Style & details" : "Contact info"}
        </span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Describe your tattoo idea *</label>
            <Textarea
              placeholder="Tell the artist about your concept — theme, mood, references, any specific imagery..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Placement</label>
            <Input
              placeholder="e.g. left forearm, upper back, ribcage"
              value={placement}
              onChange={(e) => setPlacement(e.target.value)}
            />
          </div>
          <Button
            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9]"
            disabled={!description.trim()}
            onClick={() => setStep(2)}
          >
            Next →
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Style</label>
            <div className="grid grid-cols-3 gap-2">
              {STYLE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                    style === s ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Size</label>
            <div className="grid grid-cols-4 gap-2">
              {SIZE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                    size === s ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Budget</label>
            <div className="grid grid-cols-2 gap-2">
              {BUDGET_OPTIONS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBudget(b)}
                  className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                    budget === b ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Preferred date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>← Back</Button>
            <Button className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9]" onClick={() => setStep(3)}>Next →</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Full name *</label>
            <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email *</label>
            <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Phone (optional)</label>
            <Input type="tel" placeholder="(555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(2)} disabled={submitting}>← Back</Button>
            <Button
              className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9]"
              disabled={!name.trim() || !email.trim() || submitting}
              onClick={handleSubmit}
            >
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Send Brief"}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-[#7C3AED]" />
            No payment required — artist reviews and responds within 24 hrs
          </div>
        </div>
      )}
    </div>
  )
}
