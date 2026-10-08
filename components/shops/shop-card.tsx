import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Star, MapPin } from "lucide-react"
import type { Shop } from "@/types/shop"
import { SaveButton } from "@/components/saved/save-button"
import { styleLabels } from "@/lib/styles"

export function ShopCard({
  shop,
  distanceMi,
  initialSaved,
}: {
  shop: Shop
  distanceMi?: number
  initialSaved?: boolean
}) {
  return (
    <Card className="overflow-hidden transition-all hover:border-ink hover:-translate-y-1 flex flex-col">
      <div className="relative h-32 w-full overflow-hidden">
        <img
          src={shop.coverImageUrl || "/placeholder.svg"}
          alt={`${shop.name} interior`}
          className="h-full w-full object-cover"
        />
        <SaveButton
          itemType="shop"
          itemId={shop.id}
          variant="icon"
          initialSaved={initialSaved}
          className="absolute top-2 right-2 z-10"
        />
      </div>
      <CardHeader className="flex flex-row items-start gap-4 p-4 -mt-12">
        <Avatar className="w-20 h-20 border-4 border-background bg-background">
          <AvatarImage src={shop.logoUrl || "/placeholder.svg"} alt={`${shop.name} logo`} />
          <AvatarFallback>{shop.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 pt-12">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-xl">{shop.name}</h3>
            {distanceMi != null && (
              <span className="bg-warning text-warning-foreground border border-warning text-xs px-2 py-0.5 rounded-lg shrink-0">
                {distanceMi.toFixed(1)} mi away
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-3 h-3" />
            {shop.location.city}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-flash-yellow fill-flash-yellow" />
            <span className="text-sm font-medium">{shop.rating}</span>
            <span className="text-sm text-muted-foreground">({shop.reviewCount})</span>
          </div>
          {shop.acceptsWalkIns && (
            <Badge variant="outline" className="border-success text-success">
              Walk-ins Welcome
            </Badge>
          )}
        </div>
        {shop.styles.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {styleLabels(shop.styles).slice(0, 3).map((label) => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))}
            {shop.styles.length > 3 && <Badge variant="secondary">+{shop.styles.length - 3}</Badge>}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4">
        <Button asChild className="w-full">
          <Link href={`/shops/${shop.id}`}>View Shop</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export function ShopCardSkeleton() {
  return (
    <Card>
      <Skeleton className="h-32 w-full" />
      <CardHeader className="flex flex-row items-start gap-4 p-4 -mt-12">
        <Skeleton className="w-20 h-20 rounded-full border-4 border-background" />
        <div className="flex-1 pt-12 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="flex flex-wrap gap-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-14" />
        </div>
      </CardContent>
      <CardFooter className="p-4">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  )
}
