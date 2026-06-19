import type { Metadata } from "next"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getBookingForReview, getReviewByBookingId } from "@/lib/supabase/reviews"
import { ReviewForm } from "@/components/review/review-form"
import { CheckCircle2 } from "lucide-react"

export const metadata: Metadata = {
  title: "Leave a Review — TattooMaps",
  robots: { index: false }, // don't index one-time review links
}

export default async function ReviewPage({ params }: { params: { bookingId: string } }) {
  const [booking, existing] = await Promise.all([
    getBookingForReview(params.bookingId),
    getReviewByBookingId(params.bookingId),
  ])

  // Already reviewed
  if (existing) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-sm">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold">Review already submitted</h1>
            <p className="text-muted-foreground">Thanks for sharing your experience!</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Booking not found or not completed
  if (!booking || booking.status !== "completed") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-sm">
            <h1 className="text-2xl font-bold">Link not available</h1>
            <p className="text-muted-foreground">
              This review link is either invalid or not yet active. Review links are sent after your session is marked complete.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold">How was your session?</h1>
            <p className="text-muted-foreground mt-2">
              Share your experience with <span className="font-semibold text-foreground">{booking.artistName}</span>
            </p>
          </div>
          <ReviewForm
            bookingId={params.bookingId}
            clientName={booking.clientName}
            artistName={booking.artistName}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
