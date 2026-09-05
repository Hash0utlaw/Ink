"use client"

import Link from "next/link"
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

const MOBILE_NAV_ITEMS = [
  { href: "/artists", label: "Artists", icon: Users },
  { href: "/tattoo-shops", label: "Shops", icon: Store },
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
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mobile nav trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-[300px] flex-col gap-0 p-0 sm:w-80">
              <SheetTitle className="sr-only">Navigation</SheetTitle>

              {/* Brand header */}
              <div className="flex items-center gap-2 border-b border-border/40 px-6 py-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                  <MapPin className="h-5 w-5 text-accent-foreground" />
                </div>
                <span className="bg-gradient-to-r from-accent to-accent/80 bg-clip-text text-lg font-bold text-transparent">
                  TattooMaps
                </span>
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
                          "group flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors",
                          active
                            ? "bg-accent/10 text-accent"
                            : "text-foreground/80 hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                            active
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-foreground/70 group-hover:bg-accent/10 group-hover:text-accent"
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
                  <div className="h-14 animate-pulse rounded-xl bg-muted" />
                ) : user ? (
                  <div className="space-y-1">
                    <div className="mb-2 flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={user.user_metadata?.avatar_url || "/placeholder-user.jpg"}
                          alt={user.email ?? "User avatar"}
                        />
                        <AvatarFallback>
                          {user.email?.charAt(0).toUpperCase() ?? "U"}
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
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <User className="h-4 w-4" />
                        {dashboardLabel}
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href={role === "artist" ? "/artist-dashboard/profile" : "/dashboard/profile"}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                    </SheetClose>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                ) : (
                  <SheetClose asChild>
                    <Button asChild className="w-full">
                      <Link href="/login">Sign in</Link>
                    </Button>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-accent to-accent/80 bg-clip-text text-transparent">
              TattooMaps
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link href="/artists" className="text-foreground/80 hover:text-foreground transition-colors">
            Artists
          </Link>
          <Link href="/tattoo-shops" className="text-foreground/80 hover:text-foreground transition-colors">
            Shops
          </Link>
          <Link href="/flash" className="flex items-center gap-1.5 text-foreground/80 hover:text-foreground transition-colors">
            <Zap className="w-4 h-4" />
            Flash
          </Link>
          <Link href="/styles" className="text-foreground/80 hover:text-foreground transition-colors">
            Styles
          </Link>
          <Link href="/find-artist" className="flex items-center gap-1.5 text-foreground/80 hover:text-foreground transition-colors">
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
                className="hidden md:block text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              >
                {dashboardLabel}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.user_metadata?.avatar_url || "/placeholder-user.jpg"}
                        alt={user.email ?? "User avatar"}
                      />
                      <AvatarFallback>
                        {user.email?.charAt(0).toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
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
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
