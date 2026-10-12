import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getCurrentUserId } from "@/lib/supabase/users"
import { getBookingsForArtist } from "@/lib/supabase/bookings"
import { initials } from "@/lib/initials"

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
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-[30px] leading-tight text-balance md:text-[34px]">Clients</h1>
        <p className="mt-1 text-ink-muted">People who have sent you a request.</p>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="font-semibold text-ink">No clients yet.</p>
              <p className="text-ink-muted">Share your booking link so clients can reach you.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/artist-dashboard">Get your booking link</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Last appointment</TableHead>
                  <TableHead className="text-right">Total bookings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.email}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-vellum text-ink font-heading border-1.5 border-ink">{initials(client.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{client.name}</p>
                          <p className="text-[13px] text-ink-muted">{client.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {new Date(client.lastAppointmentDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{client.totalAppointments}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
