"use client"

import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Loader2 } from "lucide-react"
import type { Artist } from "@/types/artist"

export interface BookingFormData {
  name: string
  email: string
  phone: string
  date: string
  description: string
  size: string
  placement: string
}

interface InfoSidebarProps {
  artist: Artist
  onBookingSubmit?: (data: BookingFormData) => void
  isSubmitting?: boolean
  submitSuccess?: boolean
}

const SIZE_OPTIONS = ["Small", "Medium", "Large", "Full Sleeve"]

// `artist` stays in the props for callers; the shop details it fed now live
// in the profile's "Where to find" section.
export function InfoSidebar({
  onBookingSubmit,
  isSubmitting = false,
  submitSuccess = false,
}: InfoSidebarProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [date, setDate] = useState("")
  const [description, setDescription] = useState("")
  const [size, setSize] = useState("")
  const [placement, setPlacement] = useState("")

  function handleSubmit() {
    if (onBookingSubmit) {
      onBookingSubmit({ name, email, phone, date, description, size, placement })
    }
  }

  const field = (id: string, label: string, input: ReactNode) => (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[15px] font-semibold text-ink">
        {label}
      </label>
      {input}
    </div>
  )
  const INPUT = "h-11 border-1.5 border-ink bg-white text-base"

  return (
    <div className="lg:sticky lg:top-6">
      <section aria-labelledby="request-form" className="rounded-lg border-2 border-ink bg-vellum p-5">
        <h2 id="request-form" className="font-heading text-[22px] leading-[1.15] text-ink">
          Book an appointment
        </h2>
        <div className="mt-4">
          {submitSuccess ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-bottle-green" aria-hidden="true" />
              <p className="text-lg font-semibold text-ink">Request sent</p>
              <p className="text-[15px] text-ink-muted">The artist will respond within 24 hours.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {field(
                "booking-name",
                "Full name",
                <Input id="booking-name" className={INPUT} value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} />
              )}
              {field(
                "booking-email",
                "Email",
                <Input id="booking-email" type="email" className={INPUT} value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} />
              )}
              {field(
                "booking-phone",
                "Phone (optional)",
                <Input id="booking-phone" type="tel" className={INPUT} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSubmitting} />
              )}
              {field(
                "booking-date",
                "Preferred date",
                <Input id="booking-date" type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} disabled={isSubmitting} />
              )}
              {field(
                "booking-description",
                "Describe your idea",
                <Textarea
                  id="booking-description"
                  className="border-1.5 border-ink bg-white text-base"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                />
              )}

              <fieldset>
                <legend className="mb-1.5 text-[15px] font-semibold text-ink">Size</legend>
                <div className="grid grid-cols-2 gap-1.5">
                  {SIZE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSize(option)}
                      disabled={isSubmitting}
                      aria-pressed={size === option}
                      className={`min-h-11 rounded-lg border-1.5 border-ink px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        size === option ? "bg-ink text-vellum" : "bg-vellum text-ink hover:bg-secondary"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

              {field(
                "booking-placement",
                "Placement",
                <Input
                  id="booking-placement"
                  placeholder="For example, left forearm"
                  className={INPUT}
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value)}
                  disabled={isSubmitting}
                />
              )}

              <Button
                className="min-h-11 w-full rounded-lg border-1.5 border-ink bg-flash-red text-[15px] font-semibold text-white hover:bg-flash-red/90"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send booking request"
                )}
              </Button>

              <p className="text-center text-[13px] text-ink-muted">
                Free to request, no payment and no commitment. The artist will confirm within 24 hours.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
