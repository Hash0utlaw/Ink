import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/supabase/users"
import { getSavedIdsForUser, toggleSaved, type SavedItemType } from "@/lib/supabase/saved"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ success: false, message: "Not signed in" }, { status: 401 })
  }

  const { itemType, itemId } = (await request.json()) as { itemType: SavedItemType; itemId: string }
  const { saved, error } = await toggleSaved(itemType, itemId)

  if (error) {
    return NextResponse.json({ success: false, message: error }, { status: 500 })
  }

  return NextResponse.json({ success: true, saved })
}

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ success: false, message: "Not signed in" }, { status: 401 })
  }

  const itemIds = await getSavedIdsForUser(userId)
  return NextResponse.json({ success: true, itemIds })
}
