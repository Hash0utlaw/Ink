"use client"

import { User, Heart, Calendar, Brush } from "lucide-react"
import { DashboardNav, type DashboardNavItem } from "@/components/dashboard/dashboard-nav"

const navItems: DashboardNavItem[] = [
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/favorites", label: "Favorites", icon: Heart },
  { href: "/dashboard/appointments", label: "Appointments", icon: Calendar },
  { href: "/dashboard/designs", label: "Saved designs", icon: Brush },
]

export function DashboardSidebar() {
  return <DashboardNav items={navItems} />
}
