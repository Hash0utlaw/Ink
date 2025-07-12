import { Suspense } from "react"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { CreativeGenerator } from "@/components/generator/creative-generator"

export default function GeneratorPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">AI Tattoo Generator</h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Let's craft your perfect tattoo. Follow the steps to bring your vision to life.
            </p>
          </div>
          <CreativeGenerator />
        </div>
      </main>
      <Footer />
    </div>
  )
}
