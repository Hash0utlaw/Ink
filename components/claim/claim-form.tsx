"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle } from "lucide-react"

interface ClaimFormProps {
  artistSlug: string | null
  shopSlug: string | null
  listingName: string | null
}

export function ClaimForm({ artistSlug, shopSlug, listingName }: ClaimFormProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [instagram, setInstagram] = useState("")
  const [listing, setListing] = useState(listingName ?? "")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(false)

  async function handleSubmit() {
    if (!name || !email || !listing) return
    setLoading(true)
    setError(false)
    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistSlug, shopSlug, name, email, phone, instagram, listing }),
      })
      if (!response.ok) throw new Error("Failed to submit claim")
      setSubmitted(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <Card className="bg-muted/30 border-border/50">
        <CardContent className="pt-10 pb-10 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold">Claim submitted</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            We&apos;ll verify and get back to you within 2 business days.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-muted/30 border-border/50">
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="claim-listing">Which listing is yours?</Label>
          <Input
            id="claim-listing"
            placeholder="Your name or shop name"
            value={listing}
            onChange={(e) => setListing(e.target.value)}
            className="bg-card border-border focus:border-accent/60"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="claim-name">Full name</Label>
          <Input
            id="claim-name"
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-card border-border focus:border-accent/60"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="claim-email">Email address</Label>
          <Input
            id="claim-email"
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-card border-border focus:border-accent/60"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="claim-phone">Phone (optional)</Label>
          <Input
            id="claim-phone"
            type="tel"
            placeholder="(555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="bg-card border-border focus:border-accent/60"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="claim-instagram">Instagram handle (optional)</Label>
          <Input
            id="claim-instagram"
            placeholder="@yourstudio"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            className="bg-card border-border focus:border-accent/60"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">Something went wrong submitting your claim. Please try again.</p>
        )}

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !name || !email || !listing}
          className="w-full"
        >
          {loading ? "Submitting..." : "Submit Claim"}
        </Button>
      </CardContent>
    </Card>
  )
}
