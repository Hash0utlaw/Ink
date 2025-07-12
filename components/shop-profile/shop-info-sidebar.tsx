import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin } from "lucide-react"
import type { Shop } from "@/types/shop"

export function ShopInfoSidebar({ shop }: { shop: Shop }) {
  return (
    <div className="space-y-8 sticky top-20">
      <Card className="bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle>Shop Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex gap-3">
            <MapPin className="w-4 h-4 mt-1 text-accent flex-shrink-0" />
            <div>
              <p className="font-semibold">{shop.name}</p>
              <p className="text-muted-foreground">{shop.location.address}</p>
              <p className="text-muted-foreground">{shop.location.city}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Clock className="w-4 h-4 mt-1 text-accent flex-shrink-0" />
            <div>
              <p className="font-semibold">Hours</p>
              <ul className="text-muted-foreground">
                {Object.entries(shop.hours).map(([day, hours]) => (
                  <li key={day}>
                    <span className="font-medium text-foreground">{day}:</span> {hours}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle>Specialties</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {shop.specialties.map((spec) => (
            <Badge key={spec} variant="secondary">
              {spec}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
