import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getUserData } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default async function AppointmentsPage() {
  const { appointments } = await getUserData()

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Appointments</CardTitle>
        <CardDescription>Your history of past and upcoming tattoo sessions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {appointments.map((appt) => (
          <div key={appt.id} className="flex items-center gap-4 p-4 border rounded-lg">
            <Avatar className="w-16 h-16">
              <AvatarImage src={appt.artist.avatarUrl || "/placeholder.svg"} />
              <AvatarFallback>{appt.artist.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">
                {new Date(appt.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-sm text-muted-foreground">
                with {appt.artist.name} at {appt.shop.name}
              </p>
            </div>
            <Badge
              className={cn({
                "bg-blue-500/20 text-blue-500 border-blue-500/30": appt.status === "upcoming",
                "bg-green-500/20 text-green-500 border-green-500/30": appt.status === "completed",
                "bg-red-500/20 text-red-500 border-red-500/30": appt.status === "cancelled",
              })}
            >
              {appt.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
