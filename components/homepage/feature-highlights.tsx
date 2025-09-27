import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Bot, Calendar, Navigation, Search, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { MotionView } from "@/components/utils/motion-view"

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: MapPin,
    title: "Interactive Map Discovery",
    description:
      "Explore tattoo artists and shops on an interactive map. Find exactly what you're looking for in your area or anywhere in the world.",
  },
  {
    icon: Bot,
    title: "AI Tattoo Generator",
    description:
      "Bring your ideas to life with our AI-powered tattoo generator. Create unique designs and find artists who specialize in your style.",
  },
  {
    icon: Navigation,
    title: "Location-Based Search",
    description:
      "Search by distance, neighborhood, or city. Get directions and plan your tattoo journey with precision.",
  },
  {
    icon: Calendar,
    title: "Easy Booking",
    description:
      "Book consultations and appointments directly through the platform. Manage your tattoo schedule seamlessly.",
  },
  {
    icon: Search,
    title: "Advanced Filters",
    description: "Filter by style, price range, availability, and more. Find the perfect match for your tattoo vision.",
  },
  {
    icon: Users,
    title: "Community Reviews",
    description: "Read authentic reviews from the tattoo community. Make informed decisions based on real experiences.",
  },
]

export function FeatureHighlights() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Find Your Perfect Tattoo</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            TattooMaps combines the power of interactive mapping with comprehensive artist discovery
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <MotionView key={feature.title} delay={i * 0.1}>
              <Card className="bg-card border-border/60 transition-all duration-300 hover:border-accent/50 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] h-full">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg">
                    <feature.icon className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </MotionView>
          ))}
        </div>
      </div>
    </section>
  )
}
