"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Heart, Calendar, Brush, LogOut } from "lucide-react"

const navItems = [
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/favorites", label: "Favorites", icon: Heart },
  { href: "/dashboard/appointments", label: "Appointments", icon: Calendar },
  { href: "/dashboard/designs", label: "Saved Designs", icon: Brush },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <Card className="p-4 bg-muted/50 border-border/50 sticky top-20">
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant={pathname === item.href ? "default" : "ghost"}
            className="justify-start"
            asChild
          >
            <Link href={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        ))}
        <hr className="my-2 border-border/50" />
        <Button variant="ghost" className="justify-start text-red-500 hover:text-red-500 hover:bg-red-500/10">
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </Button>
      </nav>
    </Card>
  )
}
