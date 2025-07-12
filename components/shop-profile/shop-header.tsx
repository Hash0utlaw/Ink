import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Star, Phone, MapPin } from "lucide-react"
import type { Shop } from "@/types/shop"

export function ShopHeader({ shop }: { shop: Shop }) {
  return (
    <div className="relative">
      <div className="h-48 md:h-64 w-full">
        <img
          src={shop.coverImageUrl || "/placeholder.svg"}
          alt={`${shop.name} interior`}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>
      <div className="container mx-auto px-4 -mt-16 md:-mt-20">
        <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center">
          <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-accent bg-background">
            <AvatarImage src={shop.logoUrl || "/placeholder.svg"} alt={`${shop.name} logo`} />
            <AvatarFallback className="text-4xl">{shop.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{shop.name}</h1>
            <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="text-lg font-bold">{shop.rating}</span>
                <span className="text-sm text-muted-foreground">({shop.reviewCount} reviews)</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Phone className="mr-2 h-4 w-4" /> Contact
            </Button>
            <Button>
              <MapPin className="mr-2 h-4 w-4" /> Get Directions
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
