import { NextResponse } from "next/server"
import { createAdminClient } from "@/utils/supabase/admin"

export const dynamic = "force-dynamic"

// Uptime check: 200 { ok: true } when the app and the database answer, else
// 503 { ok: false }. The ping is a head-only count on one row (no data read).
// No details in the response.
export async function GET() {
  try {
    const { error } = await createAdminClient().from("artists").select("id", { head: true }).limit(1)
    if (error) throw error
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    console.error("[health] database ping failed:", e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }
}
