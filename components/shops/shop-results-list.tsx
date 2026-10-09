import { ShopRow, ShopRowList, ShopRowSkeleton } from "./shop-row"
import { EmptyBox } from "@/components/artist-profile/profile-sections"
import { Pagination } from "@/components/listings/pagination"
import type { Shop } from "@/types/shop"

interface ShopResultsListProps {
  shops: Shop[]
  isLoading: boolean
  distancesById?: Record<string, number>
  /** Replaces the default empty-state line, e.g. for a location search. */
  emptyMessage?: string
  /** Paging; omit when every result is already loaded (near me). */
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

export function ShopResultsList({
  shops,
  isLoading,
  distancesById,
  emptyMessage,
  page = 0,
  totalPages = 1,
  onPageChange,
}: ShopResultsListProps) {
  if (isLoading) {
    return (
      <ShopRowList>
        {Array.from({ length: 6 }).map((_, i) => (
          <ShopRowSkeleton key={i} />
        ))}
      </ShopRowList>
    )
  }

  if (shops.length === 0) {
    return (
      <EmptyBox title="No shops found.">
        {emptyMessage ?? "Try a nearby city, a different style or fewer filters."}
      </EmptyBox>
    )
  }

  return (
    <div>
      <ShopRowList>
        {shops.map((shop) => (
          <ShopRow key={shop.id} shop={shop} distanceMi={distancesById?.[shop.id]} />
        ))}
      </ShopRowList>
      {onPageChange && <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />}
    </div>
  )
}
