"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Clock, MapPin, CheckCircle2, Loader2, ShieldCheck, HeartHandshake, MessageCircle } from "lucide-react"
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

export function InfoSidebar({
  artist,
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

  return (
    <div className="space-y-8 sticky top-20">
      <Card className="bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle>Book an Appointment</CardTitle>
        </CardHeader>
        <CardContent>
          {submitSuccess ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="w-14 h-14 text-green-500" />
              <p className="text-lg font-bold">Request Sent!</p>
              <p className="text-sm text-muted-foreground">The artist will respond within 24 hours.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
              <Input
                type="tel"
                placeholder="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSubmitting}
              />
              <Input
                type="date"
                placeholder="Preferred date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isSubmitting}
              />
              <Textarea
                placeholder="Describe your idea..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                rows={3}
              />

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Size</p>
                <div className="grid grid-cols-4 gap-2">
                  {SIZE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSize(option)}
                      disabled={isSubmitting}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        size === option
                          ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                          : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                placeholder="Placement (e.g. left forearm)"
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
                disabled={isSubmitting}
              />

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Booking Request"
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                No payment required. Artist will confirm within 24 hours.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-accent" />
          <span>Free to Request</span>
        </div>
        <div className="flex items-center gap-1.5">
          <HeartHandshake className="w-3.5 h-3.5 text-accent" />
          <span>No commitment</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5 text-accent" />
          <span>Direct response</span>
        </div>
      </div>

      <Card className="bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle>Shop Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex gap-3">
            <MapPin className="w-4 h-4 mt-1 text-accent" />
            <div>
              <p className="font-semibold">{artist.shopName}</p>
              <p className="text-muted-foreground">{artist.location.address}</p>
              <p className="text-muted-foreground">{artist.location.city}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Clock className="w-4 h-4 mt-1 text-accent" />
            <div>
              <p className="font-semibold">Hours</p>
              <ul className="text-muted-foreground">
                {Object.entries(artist.hours).map(([day, hours]) => (
                  <li key={day}>
                    <span className="font-medium text-foreground">{day}:</span> {hours}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
