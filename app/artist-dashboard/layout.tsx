import type React from "react"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ArtistDashboardSidebar } from "@/components/artist-dashboard/sidebar"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { getCurrentUserId, getUserProfile } from "@/lib/supabase/users"
import { createClient } from "@/utils/supabase/server"

/** True when this account owns a claimed artist profile (the Portfolio tab needs one). */
async function ownsClaimedArtist(userId: string): Promise<boolean> {
  const { data } = await createClient()
    .from("artists")
    .select("id")
    .eq("user_id", userId)
    .eq("is_claimed", true)
    .maybeSingle()
  return !!data
}

export default async function ArtistDashboardLayout({ children }: { children: React.ReactNode }) {
  const userId = await getCurrentUserId()
  const profile = userId ? await getUserProfile(userId) : null
  if (profile?.role !== "artist") {
    redirect("/dashboard")
  }
  const showPortfolio = userId ? await ownsClaimedArtist(userId) : false

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1 bg-paper tex-paper">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <ArtistDashboardSidebar showPortfolio={showPortfolio} />
            </div>
            <div className="md:col-span-3">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
