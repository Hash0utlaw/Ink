"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { MapPin, Map, User, Settings, LogOut } from "lucide-react"
import { useState, useEffect } from "react"
import { getClient } from "@/utils/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export function Header() {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchUserAndRole(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
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
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-accent-foreground" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-accent to-accent/80 bg-clip-text text-transparent">
            TattooMaps
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link href="/map" className="flex items-center gap-1.5 text-accent font-semibold hover:text-accent/80 transition-colors">
            <Map className="w-4 h-4" />
            Map
          </Link>
          <Link href="/artists" className="text-foreground/80 hover:text-foreground transition-colors">
            Artists
          </Link>
          <Link href="/shops" className="text-foreground/80 hover:text-foreground transition-colors">
            Shops
          </Link>
          <Link href="/styles" className="text-foreground/80 hover:text-foreground transition-colors">
            Styles
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
