import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getArtistDashboardData } from "@/lib/mock-data"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function AnalyticsPage() {
  const { analytics } = await getArtistDashboardData()

  const stats = [
    {
      title: "Profile Views",
      value: analytics.profileViews.currentMonth.toLocaleString(),
      change: analytics.profileViews.changePercent,
    },
    {
      title: "Booking Requests",
      value: analytics.bookingRequests.currentMonth,
      change: analytics.bookingRequests.changePercent,
    },
    {
      title: "Estimated Revenue",
      value: `$${analytics.estimatedRevenue.currentMonth.toLocaleString()}`,
      change: analytics.estimatedRevenue.changePercent,
    },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <span
                  className={cn("mr-1", {
                    "text-green-500": stat.change >= 0,
                    "text-red-500": stat.change < 0,
                  })}
                >
                  {stat.change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </span>
                {stat.change}% from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Your estimated revenue over the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for a real chart */}
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Revenue Chart</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Style Popularity</CardTitle>
            <CardDescription>Most requested styles in your bookings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.stylePopularity.map((style) => (
              <div key={style.style} className="flex items-center">
                <p className="flex-1 text-sm font-medium">{style.style}</p>
                <p className="text-sm text-muted-foreground">{style.count} requests</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
