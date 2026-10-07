import Link from "next/link"
import { POPULAR_STYLES } from "@/lib/styles"
import { ALL_STYLES } from "@/app/styles/page"

// Style guide pages live at /styles/<slug>; styles without a guide page link
// to the artist search filtered to that style instead.
const GUIDE_SLUGS = new Set<string>(ALL_STYLES.map((s) => s.slug))

export function PopularCategories() {
  return (
    <section className="py-12 md:py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Explore Popular Styles</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {POPULAR_STYLES.map((style) => (
            <Link
              href={GUIDE_SLUGS.has(style.slug) ? `/styles/${style.slug}` : `/artists?styles=${style.slug}`}
              key={style.slug}
            >
              <div className="group relative overflow-hidden rounded-lg cursor-pointer">
                <img
                  src={`/abstract-geometric-shapes.png?height=300&width=300&query=${style.slug}+tattoo`}
                  alt={`Tattoo in ${style.label} style`}
                  width={300}
                  height={300}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <h3 className="font-bold text-white text-xl text-center px-2">{style.label}</h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
