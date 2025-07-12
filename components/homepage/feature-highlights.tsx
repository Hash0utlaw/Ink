import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, Brush, CalendarCheck } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { MotionView } from "@/components/utils/motion-view"

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: Bot,
    title: "AI Tattoo Generator",
    description:
      "Bring your ideas to life. Describe your perfect tattoo and let our AI generate unique designs for you.",
  },
  {
    icon: Brush,
    title: "Discover Artists",
    description:
      "Explore portfolios from thousands of talented tattoo artists. Filter by style, location, and availability.",
  },
  {
    icon: CalendarCheck,
    title: "Book Appointments",
    description: "Seamlessly schedule your next tattoo session directly with your chosen artist or shop.",
  },
]

export function FeatureHighlights() {
  return (
    <section className="py-12 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, i) => (
            <MotionView key={feature.title} delay={i * 0.1}>
              <Card className="bg-card border-border/60 transition-all duration-300 hover:border-accent/50 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]">
                <CardHeader className="flex flex-row items-center gap-4">
                  <feature.icon className="h-8 w-8 text-accent" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </MotionView>
          ))}
        </div>
      </div>
    </section>
  )
}
