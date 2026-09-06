"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Loader2, Star } from "lucide-react"

interface ReviewFormProps {
  bookingId: string
  clientName: string
  artistName: string
}

export function ReviewForm({ bookingId, clientName, artistName }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!rating) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, rating, reviewText: reviewText.trim() || null, clientName }),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        const json = await res.json()
        setError(json.error ?? "Something went wrong")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-xl font-bold">Thank you!</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Your review has been posted. It helps other clients find amazing artists like {artistName}.
        </p>
      </div>
    )
  }

  const display = hovered || rating

  return (
    <div className="space-y-6">
      {/* Star picker */}
      <div>
        <p className="text-sm font-medium mb-3 text-center">Tap to rate</p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-10 h-10 transition-colors ${
                  star <= display
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
        </div>
        {display > 0 && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            {["", "Poor", "Fair", "Good", "Great", "Excellent!"][display]}
          </p>
        )}
      </div>

      {/* Review text */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">Tell others about your experience (optional)</label>
        <Textarea
          placeholder={`What made your session with ${artistName} special?`}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={4}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] h-12 text-base"
        disabled={!rating || submitting}
        onClick={handleSubmit}
      >
        {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : "Submit Review"}
      </Button>
    </div>
  )
}
