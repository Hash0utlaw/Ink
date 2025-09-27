"use client"

import Link from "next/link"
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
import { MapPin, User, Settings, LogOut, Map } from "lucide-react"
import { useState, useEffect } from "react"

export function Header() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate auth check - replace with actual Supabase auth
    const checkAuth = async () => {
      try {
        // const { data: { user } } = await supabase.auth.getUser()
        // setUser(user)
        setUser(null) // Temporarily set to null until auth is fixed
      } catch (error) {
        console.error("Auth error:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

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
          <Link
            href="/map"
            className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors"
          >
            <Map className="w-4 h-4" />
            Explore Map
          </Link>
          <Link href="/artists" className="text-foreground/80 hover:text-foreground transition-colors">
            Find Artists
          </Link>
          <Link href="/shops" className="text-foreground/80 hover:text-foreground transition-colors">
            Find Shops
          </Link>
          <Link href="/generator" className="text-foreground/80 hover:text-foreground transition-colors">
            AI Generator
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url || "/placeholder.svg"} alt={user.email} />
                    <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.user_metadata?.full_name || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
