import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star } from "lucide-react"
import type { Review } from "@/lib/supabase/reviews"

function formatDate(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

export function ReviewsSection({ reviews }: { reviews: Review[] }) {
  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle>Client Reviews</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No reviews yet.</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="flex gap-4">
              <Avatar>
                <AvatarFallback>{review.clientName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{review.clientName}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`}
                      />
                    ))}
                  </div>
                </div>
                {review.reviewText && (
                  <p className="text-sm text-muted-foreground mt-2">{review.reviewText}</p>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
