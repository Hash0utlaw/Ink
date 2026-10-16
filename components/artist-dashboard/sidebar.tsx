"use client"

import { LayoutDashboard, User, Calendar, Zap, BarChart3, Users, Images } from "lucide-react"
import { DashboardNav, type DashboardNavItem } from "@/components/dashboard/dashboard-nav"
import { useSignOut } from "@/components/dashboard/use-sign-out"

const navItems: DashboardNavItem[] = [
  { href: "/artist-dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/artist-dashboard/appointments", label: "Appointments", icon: Calendar },
  { href: "/artist-dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/artist-dashboard/clients", label: "Clients", icon: Users },
  { href: "/artist-dashboard/flash", label: "Flash", icon: Zap },
  { href: "/artist-dashboard/profile", label: "Edit profile", icon: User },
]

const portfolioItem: DashboardNavItem = { href: "/artist-dashboard/portfolio", label: "Portfolio", icon: Images }

/** `showPortfolio`: the artist owns a claimed profile, so Portfolio sits between Flash and Edit profile. */
export function ArtistDashboardSidebar({ showPortfolio = false }: { showPortfolio?: boolean }) {
  const signOut = useSignOut()
  const items = showPortfolio
    ? navItems.flatMap((item) => (item.href === "/artist-dashboard/profile" ? [portfolioItem, item] : [item]))
    : navItems
  return <DashboardNav items={items} onSignOut={signOut} />
}
