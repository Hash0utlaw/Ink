import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getBookingsForArtist } from "@/lib/supabase/bookings"
import { getCurrentUserId } from "@/lib/supabase/users"
import { getArtistHandleForUser } from "@/lib/supabase/artists"
import { NoRequestsYet } from "@/components/artist-dashboard/no-requests-yet"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function AnalyticsPage() {
  const userId = await getCurrentUserId()
  const [bookings, handle] = await Promise.all([
    userId ? getBookingsForArtist(userId) : Promise.resolve([]),
    userId ? getArtistHandleForUser(userId) : Promise.resolve(null),
  ])

  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1
  const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear

  const thisMonthCount = bookings.filter((b) => {
    const d = new Date(b.createdAt)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  }).length

  const prevMonthCount = bookings.filter((b) => {
    const d = new Date(b.createdAt)
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear
  }).length

  const changePercent =
    prevMonthCount === 0 ? 0 : Math.round(((thisMonthCount - prevMonthCount) / prevMonthCount) * 100)

  // Tally style popularity from booking size/placement fields as a proxy until
  // a dedicated analytics table exists.
  const sizeMap: Record<string, number> = {}
  for (const b of bookings) {
    if (b.size) sizeMap[b.size] = (sizeMap[b.size] ?? 0) + 1
  }
  const stylePopularity = Object.entries(sizeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([style, count]) => ({ style, count }))

  // Only stats with something to count; a zero is never shown.
  const stats = [
    { title: "Booking requests this month", value: thisMonthCount, change: changePercent, note: "vs last month" },
    { title: "Total bookings", value: bookings.length, change: 0, note: "all time" },
  ].filter((s) => s.value > 0)

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-[30px] leading-tight text-balance md:text-[34px]">Analytics</h1>

      {bookings.length === 0 ? (
        <NoRequestsYet handle={handle} />
      ) : (
        <>
          <Card>
            <CardContent className="p-6">
              <dl className="grid gap-6 sm:grid-cols-2">
                {stats.map((stat) => (
                  <div key={stat.title}>
                    <dt className="text-sm font-semibold text-ink">{stat.title}</dt>
                    <dd className="font-heading text-[30px] leading-tight tabular-nums">{stat.value}</dd>
                    <dd className="flex items-center gap-1 text-[13px] text-ink-muted">
                      {stat.change !== 0 && (
                        <span
                          className={cn("font-semibold tabular-nums", {
                            "text-success": stat.change > 0,
                            "text-destructive": stat.change < 0,
                          })}
                        >
                          {stat.change > 0 ? (
                            <ArrowUpRight className="inline h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowDownRight className="inline h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {Math.abs(stat.change)}%
                        </span>
                      )}
                      {stat.note}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {stylePopularity.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Popular sizes</CardTitle>
                <CardDescription>Most requested tattoo sizes from your bookings.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul>
                  {stylePopularity.map((item) => (
                    <li
                      key={item.style}
                      className="flex items-center border-b border-rule py-2.5 first:pt-0 last:border-0 last:pb-0"
                    >
                      <p className="flex-1 text-[15px] font-semibold">{item.style}</p>
                      <p className="text-sm text-ink-muted tabular-nums">
                        {item.count} {item.count === 1 ? "request" : "requests"}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
