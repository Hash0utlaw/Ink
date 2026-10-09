import { ShopCard, ShopCardSkeleton } from "./shop-card"
import type { Shop } from "@/types/shop"

interface ShopResultsListProps {
  shops: Shop[]
  isLoading: boolean
  distancesById?: Record<string, number>
  /** Replaces the default empty-state line, e.g. for a location search. */
  emptyMessage?: string
}

export function ShopResultsList({ shops, isLoading, distancesById, emptyMessage }: ShopResultsListProps) {
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
        <p className="text-muted-foreground mt-2">{emptyMessage ?? "Try adjusting your filters to find more results."}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {shops.map((shop) => (
        <ShopCard
          key={shop.id}
          shop={shop}
          distanceMi={distancesById?.[shop.id]}
        />
      ))}
    </div>
  )
}
