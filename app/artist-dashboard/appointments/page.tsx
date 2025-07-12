import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { getUserData } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default async function AppointmentsPage() {
  const { appointments } = await getUserData() // Using user appointments for now

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Appointments</h1>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Bookings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {appointments
                .filter((a) => a.status === "upcoming")
                .map((appt) => (
                  <div key={appt.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold">
                        {new Date(appt.date).toLocaleDateString("en-US", { month: "long", day: "numeric" })} at{" "}
                        {appt.time}
                      </p>
                      <p className="text-sm text-muted-foreground">with {appt.artist.name}</p>
                    </div>
                    <Badge
                      className={cn({
                        "bg-blue-500/20 text-blue-500 border-blue-500/30": appt.status === "upcoming",
                      })}
                    >
                      {appt.status}
                    </Badge>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-2">
              <Calendar mode="single" className="p-0" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
