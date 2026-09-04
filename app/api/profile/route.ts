import { NextResponse } from "next/server"
import { getCurrentUserId, updateUserProfile } from "@/lib/supabase/users"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ success: false, message: "Not signed in" }, { status: 401 })
  }

  const { name, email, location } = await request.json()
  const { error } = await updateUserProfile(userId, { name, email, location })

  if (error) {
    return NextResponse.json({ success: false, message: error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
