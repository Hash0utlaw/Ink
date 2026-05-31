import { createClient } from "@/utils/supabase/server"

// Matches the booking_requests table created in app/api/bookings/route.ts.
// Columns: id, artist_id, client_name, client_email, client_phone,
//          preferred_date, description, size, placement, status, created_at
export interface BookingRequest {
  id: string
  artistId: string
  clientName: string
  clientEmail: string
  clientPhone: string | null
  preferredDate: string | null
  description: string | null
  size: string | null
  placement: string | null
  status: "pending" | "confirmed" | "cancelled"
  createdAt: string
}

function rowToBooking(row: Record<string, unknown>): BookingRequest {
  return {
    id: String(row.id ?? ""),
    artistId: String(row.artist_id ?? ""),
    clientName: String(row.client_name ?? ""),
    clientEmail: String(row.client_email ?? ""),
    clientPhone: row.client_phone != null ? String(row.client_phone) : null,
    preferredDate: row.preferred_date != null ? String(row.preferred_date) : null,
    description: row.description != null ? String(row.description) : null,
    size: row.size != null ? String(row.size) : null,
    placement: row.placement != null ? String(row.placement) : null,
    status: (row.status as "pending" | "confirmed" | "cancelled") ?? "pending",
    createdAt: String(row.created_at ?? ""),
  }
}

export async function getBookingsForArtist(artistId: string): Promise<BookingRequest[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false })

    if (error || !data) return []
    return data.map((row) => rowToBooking(row as Record<string, unknown>))
  } catch {
    return []
  }
}
