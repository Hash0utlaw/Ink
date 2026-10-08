"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MapPin,
  User,
  Settings,
  LogOut,
  Zap,
  Compass,
  Menu,
  Users,
  Store,
  Palette,
  ChevronRight,
} from "lucide-react"
import { useState, useEffect } from "react"
import { getClient } from "@/utils/supabase/client"
import type { AuthChangeEvent, Session, User as SupabaseUser } from "@supabase/supabase-js"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from "@/components/ui/sheet"
import { initials } from "@/lib/initials"

const MOBILE_NAV_ITEMS = [
  { href: "/artists", label: "Artists", icon: Users },
  { href: "/tattoo-shops", label: "Shops", icon: Store },
  { href: "/map", label: "Map", icon: MapPin },
  { href: "/flash", label: "Flash", icon: Zap },
  { href: "/styles", label: "Styles", icon: Palette },
  { href: "/find-artist", label: "Find Artist", icon: Compass },
]

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  // From an artist or shop page, send people back there after signing in / up.
  const returnsHere = /^\/(artists|shops)\/[^/]+/.test(pathname ?? "")
  const loginHref = returnsHere ? `/login?next=${encodeURIComponent(pathname)}` : "/login"

  useEffect(() => {
    const supabase = getClient()

    if (!supabase) {
      setIsLoading(false)
      return
    }

    const fetchUserAndRole = async (authUser: SupabaseUser | null) => {
      if (!authUser) {
        setUser(null)
        setRole(null)
        setIsLoading(false)
        return
      }
      setUser(authUser)
      try {
        const { data } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", authUser.id)
          .single()
        setRole(data?.role ?? null)
      } catch {
        setRole(null)
      }
      setIsLoading(false)
    }

    // Initial session check
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      fetchUserAndRole(authUser)
    })

    // Keep state reactive
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      fetchUserAndRole(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    setMobileOpen(false)
    const supabase = getClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.push("/")
  }

  const dashboardLink = role === "artist" ? "/artist-dashboard" : "/dashboard"
  const dashboardLabel = role === "artist" ? "Dashboard" : "Browse"

  return (
    <header className="sticky top-0 z-50 w-full border-b-3 border-ink bg-navy">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mobile nav trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden rounded-lg border-1.5 border-cream text-cream hover:bg-cream/10 hover:text-cream" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-[300px] flex-col gap-0 p-0 sm:w-80">
              <SheetTitle className="sr-only">Navigation</SheetTitle>

              {/* Brand header */}
              <div className="flex items-center gap-2 border-b border-border/40 px-6 py-5">
                <Image src="/brand/logo-wordmark-ink.webp" alt="TattooMaps" width={70} height={40} className="h-10 w-auto" />
              </div>

              {/* Nav links */}
              <nav className="flex flex-col gap-1 px-3 py-4">
                {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname?.startsWith(`${href}/`)
                  return (
                    <SheetClose asChild key={href}>
                      <Link
                        href={href}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium transition-colors",
                          active
                            ? "bg-secondary text-primary"
                            : "text-foreground/80 hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground/70 group-hover:bg-secondary group-hover:text-primary"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        {label}
                        <ChevronRight className="ml-auto h-4 w-4 -translate-x-1 text-muted-foreground/40 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                      </Link>
                    </SheetClose>
                  )
                })}
              </nav>

              {/* Auth section */}
              <div className="mt-auto border-t border-border/40 p-4">
                {isLoading ? (
                  <div className="h-14 animate-pulse rounded-lg bg-muted" />
                ) : user ? (
                  <div className="space-y-1">
                    <div className="mb-2 flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={user.user_metadata?.avatar_url || "/placeholder-user.jpg"}
                          alt={user.email ?? "User avatar"}
                        />
                        <AvatarFallback className="bg-vellum text-ink font-heading border-1.5 border-ink">
                          {initials(user.email ?? "") || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-tight">
                          {user.user_metadata?.full_name || "User"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <SheetClose asChild>
                      <Link
                        href={dashboardLink}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <User className="h-4 w-4" />
                        {dashboardLabel}
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href={role === "artist" ? "/artist-dashboard/profile" : "/dashboard/profile"}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                    </SheetClose>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                ) : (
                  <SheetClose asChild>
                    <Button asChild className="w-full">
                      <Link href={loginHref}>Sign in</Link>
                    </Button>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/brand/logo-wordmark-cream.webp" alt="TattooMaps" width={70} height={40} className="h-10 w-auto" priority />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link href="/artists" className="text-cream underline-offset-4 hover:underline">
            Artists
          </Link>
          <Link href="/tattoo-shops" className="text-cream underline-offset-4 hover:underline">
            Shops
          </Link>
          <Link href="/map" className="text-cream underline-offset-4 hover:underline">
            Map
          </Link>
          <Link href="/flash" className="flex items-center gap-1.5 text-cream underline-offset-4 hover:underline">
            <Zap className="w-4 h-4" />
            Flash
          </Link>
          <Link href="/styles" className="text-cream underline-offset-4 hover:underline">
            Styles
          </Link>
          <Link href="/find-artist" className="flex items-center gap-1.5 text-cream underline-offset-4 hover:underline">
            <Compass className="w-4 h-4" />
            Find Artist
          </Link>
        </nav>

        {/* Auth Section */}
        <div className="flex items-center space-x-4">
          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <>
              <Link
                href={dashboardLink}
                className="hidden md:block text-sm font-medium text-cream underline-offset-4 hover:underline"
              >
                {dashboardLabel}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    aria-label="Account menu"
                    className="relative h-10 w-10 overflow-hidden rounded-lg border-1.5 border-cream bg-transparent p-0 text-cream hover:bg-cream/10 hover:text-cream [&_svg]:size-5"
                  >
                    {user.user_metadata?.avatar_url ? (
                      <Avatar className="h-full w-full rounded-none">
                        <AvatarImage src={user.user_metadata.avatar_url} alt="" className="object-cover" />
                        <AvatarFallback className="rounded-none bg-transparent text-cream">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <User className="h-5 w-5" aria-hidden="true" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.user_metadata?.full_name || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={dashboardLink} className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>{dashboardLabel}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href={role === "artist" ? "/artist-dashboard/profile" : "/dashboard/profile"}
                      className="flex items-center"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center cursor-pointer text-destructive focus:text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild>
              <Link href={loginHref}>Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
