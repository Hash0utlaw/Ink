"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Calendar, Users, LogOut, Crown } from "lucide-react"

const navItems = [
  { href: "/artist-dashboard/appointments", label: "Appointments", icon: Calendar },
  { href: "/artist-dashboard/profile", label: "Edit Profile", icon: User },
  { href: "/artist-dashboard/clients", label: "Clients", icon: Users },
]

export function ArtistDashboardSidebar({ isPro = false }: { isPro?: boolean }) {
  const pathname = usePathname()

  return (
    <Card className="p-4 bg-muted/50 border-border/50 sticky top-20">
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant={pathname.startsWith(item.href) ? "default" : "ghost"}
            className="justify-start"
            asChild
          >
            <Link href={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        ))}
        {!isPro && (
          <div
            className="rounded-lg p-4 mt-2 flex flex-col gap-2"
            style={{ background: "linear-gradient(135deg, #7C3AED, #4C1D95)" }}
          >
            <Crown className="h-5 w-5 text-white" />
            <p className="text-white font-bold text-sm leading-tight">Upgrade to Pro</p>
            <p className="text-white text-xs leading-snug opacity-90">
              Priority search, booking button &amp; 30 portfolio photos
            </p>
            <button
              className="mt-1 w-full rounded-md py-1.5 text-sm font-semibold text-white"
              style={{ backgroundColor: "#5B21B6" }}
            >
              Upgrade — $29/mo
            </button>
          </div>
        )}
        <hr className="my-2 border-border/50" />
        <Button variant="ghost" className="justify-start text-red-500 hover:text-red-500 hover:bg-red-500/10">
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </Button>
      </nav>
    </Card>
  )
}
