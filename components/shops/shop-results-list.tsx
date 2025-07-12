import { ShopCard, ShopCardSkeleton } from "./shop-card"
import type { Shop } from "@/types/shop"

interface ShopResultsListProps {
  shops: Shop[]
  isLoading: boolean
}

export function ShopResultsList({ shops, isLoading }: ShopResultsListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <ShopCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (shops.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold">No Shops Found</h3>
        <p className="text-muted-foreground mt-2">Try adjusting your filters to find more results.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {shops.map((shop) => (
        <ShopCard key={shop.id} shop={shop} />
      ))}
    </div>
  )
}
