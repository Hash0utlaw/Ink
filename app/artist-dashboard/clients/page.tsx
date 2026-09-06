import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getCurrentUserId } from "@/lib/supabase/users"
import { getBookingsForArtist } from "@/lib/supabase/bookings"

interface ClientRow {
  email: string
  name: string
  lastAppointmentDate: string
  totalAppointments: number
}

export default async function ClientsPage() {
  const userId = await getCurrentUserId()
  const bookings = userId ? await getBookingsForArtist(userId) : []

  const clientsByEmail = new Map<string, ClientRow>()
  for (const booking of bookings) {
    const existing = clientsByEmail.get(booking.clientEmail)
    if (!existing) {
      clientsByEmail.set(booking.clientEmail, {
        email: booking.clientEmail,
        name: booking.clientName,
        lastAppointmentDate: booking.createdAt,
        totalAppointments: 1,
      })
    } else {
      existing.totalAppointments += 1
      if (new Date(booking.createdAt) > new Date(existing.lastAppointmentDate)) {
        existing.lastAppointmentDate = booking.createdAt
      }
    }
  }
  const clients = Array.from(clientsByEmail.values())

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client List</CardTitle>
        <CardDescription>Manage your client information and notes.</CardDescription>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No clients yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Last Appointment</TableHead>
                <TableHead className="text-right">Total Bookings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.email}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(client.lastAppointmentDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">{client.totalAppointments}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
