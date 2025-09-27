"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function MapSkeleton() {
  return (
    <div className="relative h-[calc(100vh-140px)] w-full overflow-hidden">
      {/* Search Bar Skeleton */}
      <div className="absolute top-4 left-4 right-4 z-20">
        <Card className="p-3">
          <Skeleton className="h-10 w-full" />
        </Card>
      </div>

      {/* Controls Skeleton */}
      <div className="absolute top-20 right-4 z-20">
        <Card className="p-2">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-32" />
          </div>
        </Card>
      </div>

      {/* Sidebar Skeleton */}
      <div className="absolute left-0 top-0 bottom-0 z-10 w-80 bg-background border-r">
        <div className="p-4 border-b">
          <Skeleton className="h-6 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="p-4 border-b">
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="w-16 h-16 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-12" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Map Skeleton */}
      <div className="ml-80 h-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    </div>
  )
}
