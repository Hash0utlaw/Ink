import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"

export function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-secondary/95 backdrop-blur">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <div className="mr-6 flex items-center space-x-2">
            <Image src="/logo.png" alt="Inkfinder Logo" width={28} height={28} className="opacity-50" />
            <span className="hidden font-extrabold tracking-wide sm:inline-block text-muted-foreground">Inkfinder</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-14" />
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none" />
          <nav className="hidden md:flex items-center gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </nav>
        </div>
        <Skeleton className="h-9 w-9 rounded-md md:hidden" />
      </div>
    </header>
  )
}
