import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { BrandReference } from "@/components/brand/brand-reference"
import { createClient } from "@/utils/supabase/server"
import { isAdmin } from "@/lib/admin"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Design | TattooMaps Admin",
  robots: { index: false, follow: false },
}

export default async function AdminDesignPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) notFound()

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="container mx-auto max-w-6xl px-4 py-12">
        <h1 className="mb-2 font-heading text-[44px] leading-tight">Brand components</h1>
        <p className="mb-12 max-w-[70ch] text-ink-muted">
          Living reference for components/brand. Source art: docs/design/brand-pieces-reference.html.
        </p>
        <BrandReference />
      </main>
      <Footer />
    </div>
  )
}
