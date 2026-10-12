"use client"

import { LayoutDashboard, User, Calendar, Zap, BarChart3, Users } from "lucide-react"
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

export function ArtistDashboardSidebar() {
  const signOut = useSignOut()
  return <DashboardNav items={navItems} onSignOut={signOut} />
}
