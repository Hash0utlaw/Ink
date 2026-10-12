import { Suspense } from "react"
import type { Metadata } from "next"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { FindArtistWizard } from "@/components/find-artist/find-artist-wizard"
import { FinderIntro } from "@/components/find-artist/finder-ui"

export const metadata: Metadata = {
  title: "Find a tattoo artist near you | TattooMaps",
  description:
    "Answer two quick questions and see every tattoo artist near you who does the style you want, nearest first.",
  alternates: { canonical: "/find-artist" },
}

export default function FindArtistPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1 bg-paper tex-paper">
        {/* The steps read the URL on the client; the heading is in the server HTML either way. */}
        <Suspense
          fallback={
            <div className="mx-auto flex w-full max-w-[620px] flex-col gap-8 px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
              <FinderIntro />
            </div>
          }
        >
          <FindArtistWizard />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
