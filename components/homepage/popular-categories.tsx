import Link from "next/link"

const styles = [
  { name: "Realism", query: "photorealistic+tattoo" },
  { name: "Traditional", query: "american+traditional+tattoo" },
  { name: "Geometric", query: "geometric+tattoo" },
  { name: "Watercolor", query: "watercolor+tattoo" },
  { name: "Japanese", query: "japanese+irezumi+tattoo" },
  { name: "Blackwork", query: "blackwork+tattoo" },
]

export function PopularCategories() {
  return (
    <section className="py-12 md:py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Explore Popular Styles</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {styles.map((style) => (
            <Link href={`/styles/${style.name.toLowerCase()}`} key={style.name}>
              <div className="group relative overflow-hidden rounded-lg cursor-pointer">
                <img
                  src={`/abstract-geometric-shapes.png?height=300&width=300&query=${style.query}`}
                  alt={`Tattoo in ${style.name} style`}
                  width={300}
                  height={300}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <h3 className="font-bold text-white text-xl">{style.name}</h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
