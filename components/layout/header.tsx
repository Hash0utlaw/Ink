import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Menu, LayoutDashboard, LogOut } from "lucide-react"
import { signout } from "@/app/(auth)/actions"

// ---------- Helper component ----------
const UserNav = ({ userEmail }: { userEmail: string }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="relative h-9 w-9 rounded-full">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-accent text-accent-foreground">{userEmail?.[0].toUpperCase()}</AvatarFallback>
        </Avatar>
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent className="w-56" align="end" forceMount>
      <DropdownMenuLabel className="font-normal">
        <div className="flex flex-col space-y-1">
          <p className="text-sm font-medium leading-none">Logged in as</p>
          <p className="text-xs leading-none text-muted-foreground truncate">{userEmail}</p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/dashboard">
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/artist-dashboard">
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Artist Dashboard
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <form action={signout}>
        <DropdownMenuItem asChild>
          <button className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </button>
        </DropdownMenuItem>
      </form>
    </DropdownMenuContent>
  </DropdownMenu>
)

// ---------- Main header ----------
export async function Header() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-secondary/95 backdrop-blur">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        {/* Left – logo & primary nav */}
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Image src="/logo.png" alt="Inkfinder Logo" width={28} height={28} />
            <span className="hidden font-extrabold tracking-wide sm:inline-block">Inkfinder</span>
          </Link>

          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/generator" className="text-foreground/80 hover:text-foreground">
              AI Generator
            </Link>
            <Link href="/artists" className="text-foreground/80 hover:text-foreground">
              Artists
            </Link>
            <Link href="/shops" className="text-foreground/80 hover:text-foreground">
              Shops
            </Link>
            <Link href="/styles" className="text-foreground/80 hover:text-foreground">
              Styles
            </Link>
          </nav>
        </div>

        {/* Center spacer / future search */}
        <div className="flex flex-1 items-center justify-between md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none" />
          {/* Desktop auth controls */}
          <nav className="hidden md:flex items-center gap-2">
            {user ? (
              <UserNav userEmail={user.email ?? ""} />
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Log In</Link>
                </Button>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <nav className="flex flex-col gap-4 text-lg font-medium">
              <Link href="/generator">AI Generator</Link>
              <Link href="/artists">Artists</Link>
              <Link href="/shops">Shops</Link>
              <Link href="/styles">Styles</Link>
            </nav>
            <div className="mt-6 pt-6 border-t border-border">
              {user ? (
                <div className="flex flex-col gap-2">
                  <Button variant="ghost" asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                  <form action={signout}>
                    <Button
                      variant="ghost"
                      className="justify-start text-red-500 hover:text-red-500 hover:bg-red-500/10"
                    >
                      Log Out
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button variant="ghost" asChild>
                    <Link href="/login">Log In</Link>
                  </Button>
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                    <Link href="/signup">Sign Up</Link>
                  </Button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
