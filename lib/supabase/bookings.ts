import { createClient } from "@/utils/supabase/server"

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
  style: string | null
  budget: string | null
  referenceImages: string[]
  depositAmount: number | null
  depositPaid: boolean
  status: "pending" | "confirmed" | "declined" | "cancelled" | "completed"
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
    style: row.style != null ? String(row.style) : null,
    budget: row.budget != null ? String(row.budget) : null,
    referenceImages: Array.isArray(row.reference_images) ? (row.reference_images as string[]) : [],
    depositAmount: row.deposit_amount != null ? Number(row.deposit_amount) : null,
    depositPaid: Boolean(row.deposit_paid ?? false),
    status: (row.status as BookingRequest["status"]) ?? "pending",
    createdAt: String(row.created_at ?? ""),
  }
}

// Resolves auth user UUID → artist UUID via the user_id FK
async function getArtistIdForUser(userId: string): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("artists")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()
    return (data as { id: string } | null)?.id ?? null
  } catch {
    return null
  }
}

export async function getBookingsForArtist(userId: string): Promise<BookingRequest[]> {
  try {
    const artistId = await getArtistIdForUser(userId)
    if (!artistId) return []
    const supabase = createClient()
    const { data, error } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false })
    if (error || !data) return []
    return data.map((row: Record<string, unknown>) => rowToBooking(row))
  } catch {
    return []
  }
}

export async function getBookingById(bookingId: string): Promise<BookingRequest | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("id", bookingId)
      .single()
    if (error || !data) return null
    return rowToBooking(data as Record<string, unknown>)
  } catch {
    return null
  }
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingRequest["status"]
): Promise<{ error: string | null }> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from("booking_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", bookingId)
    return { error: error?.message ?? null }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
