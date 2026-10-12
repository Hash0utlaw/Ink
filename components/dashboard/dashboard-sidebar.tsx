"use client"

import { User, Heart, Calendar } from "lucide-react"
import { DashboardNav, type DashboardNavItem } from "@/components/dashboard/dashboard-nav"
import { useSignOut } from "@/components/dashboard/use-sign-out"

const navItems: DashboardNavItem[] = [
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/favorites", label: "Favorites", icon: Heart },
  { href: "/dashboard/appointments", label: "Appointments", icon: Calendar },
]

export function DashboardSidebar() {
  const signOut = useSignOut()
  return <DashboardNav items={navItems} onSignOut={signOut} />
}
