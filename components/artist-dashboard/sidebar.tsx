"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, User, Calendar, LogOut, Crown, Zap, BarChart3, Users } from "lucide-react"
import { getClient } from "@/utils/supabase/client"

const navItems = [
  { href: "/artist-dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/artist-dashboard/appointments", label: "Appointments", icon: Calendar },
  { href: "/artist-dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/artist-dashboard/clients", label: "Clients", icon: Users },
  { href: "/artist-dashboard/flash", label: "Flash", icon: Zap },
  { href: "/artist-dashboard/profile", label: "Edit Profile", icon: User },
]

export function ArtistDashboardSidebar({ isPro = false }: { isPro?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = getClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.push("/")
  }

  return (
    <Card className="p-4 bg-muted/50 border-border/50 sticky top-20">
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Button
              key={item.label}
              variant={active ? "default" : "ghost"}
              className="justify-start"
              asChild
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          )
        })}
        {!isPro && (
          <div className="rounded-lg p-4 mt-2 flex flex-col gap-2 bg-gradient-to-br from-primary to-[hsl(var(--hero-tertiary))]">
            <Crown className="h-5 w-5 text-primary-foreground" />
            <p className="text-primary-foreground font-bold text-sm leading-tight">Upgrade to Pro</p>
            <p className="text-primary-foreground text-xs leading-snug opacity-90">
              Priority search, booking button &amp; 30 portfolio photos
            </p>
            <button className="mt-1 w-full rounded-md py-1.5 text-sm font-semibold text-primary-foreground bg-[hsl(var(--hero-tertiary))] hover:bg-[hsl(var(--hero-tertiary))]/90 transition-colors">
              Upgrade — $29/mo
            </button>
          </div>
        )}
        <hr className="my-2 border-border/50" />
        <Button
          variant="ghost"
          className="justify-start text-red-500 hover:text-red-500 hover:bg-red-500/10"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </Button>
      </nav>
    </Card>
  )
}
