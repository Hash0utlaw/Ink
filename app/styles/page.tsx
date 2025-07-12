import { Suspense } from "react"
import Link from "next/link"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { MotionView } from "@/components/utils/motion-view"

const styles = [
  { name: "Realism", query: "photorealistic+tattoo", slug: "realism" },
  { name: "Traditional", query: "american+traditional+tattoo", slug: "traditional" },
  { name: "Geometric", query: "geometric+tattoo", slug: "geometric" },
  { name: "Watercolor", query: "watercolor+tattoo", slug: "watercolor" },
  { name: "Japanese", query: "japanese+irezumi+tattoo", slug: "japanese" },
  { name: "Blackwork", query: "blackwork+tattoo", slug: "blackwork" },
  { name: "Fine Line", query: "fine+line+tattoo", slug: "fine-line" },
]

export default function AllStylesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Explore Tattoo Styles</h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              From timeless classics to modern masterpieces, discover the perfect style for your next piece of art.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {styles.map((style, i) => (
              <MotionView key={style.name} delay={i * 0.05}>
                <Link href={`/styles/${style.slug}`}>
                  <div className="group relative overflow-hidden rounded-lg cursor-pointer aspect-video">
                    <img
                      src={`/abstract-geometric-shapes.png?height=300&width=500&query=${style.query}`}
                      alt={`Tattoo in ${style.name} style`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-start p-4">
                      <h3 className="font-bold text-white text-2xl">{style.name}</h3>
                    </div>
                  </div>
                </Link>
              </MotionView>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
