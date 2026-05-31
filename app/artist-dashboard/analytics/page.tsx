import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getBookingsForArtist } from "@/lib/supabase/bookings"
import { getCurrentUserId } from "@/lib/supabase/users"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function AnalyticsPage() {
  const userId = await getCurrentUserId()
  const bookings = userId ? await getBookingsForArtist(userId) : []

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

  const stats = [
    { title: "Profile Views", value: "—", change: 0, note: "tracking not yet wired" },
    { title: "Booking Requests (this month)", value: thisMonthCount, change: changePercent, note: "vs last month" },
    { title: "Total Bookings", value: bookings.length, change: 0, note: "all time" },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Analytics</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {stat.change !== 0 && (
                  <span
                    className={cn({
                      "text-green-500": stat.change > 0,
                      "text-red-500": stat.change < 0,
                    })}
                  >
                    {stat.change > 0 ? (
                      <ArrowUpRight className="inline h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="inline h-3.5 w-3.5" />
                    )}
                    {Math.abs(stat.change)}%
                  </span>
                )}
                {stat.note}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Revenue tracking coming in a future update.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Revenue Chart — coming soon</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Popular Sizes</CardTitle>
            <CardDescription>Most requested tattoo sizes from your bookings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stylePopularity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              stylePopularity.map((item) => (
                <div key={item.style} className="flex items-center">
                  <p className="flex-1 text-sm font-medium">{item.style}</p>
                  <p className="text-sm text-muted-foreground">{item.count} requests</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
