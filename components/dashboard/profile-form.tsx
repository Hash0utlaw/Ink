"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initials } from "@/lib/initials"

interface ProfileFormProps {
  initialName: string
  initialEmail: string
  initialLocation: string
  avatarUrl: string
}

export function ProfileForm({ initialName, initialEmail, initialLocation, avatarUrl }: ProfileFormProps) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [location, setLocation] = useState(initialLocation)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, location }),
      })
      if (response.ok) setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-[30px] leading-tight text-balance md:text-[34px]">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>My profile</CardTitle>
          <CardDescription>Update your name, email and location.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* No avatar upload for client accounts yet, so there's no "Change photo" button. */}
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl || "/placeholder.svg"} />
            <AvatarFallback className="bg-vellum text-ink font-heading border-1.5 border-ink">{initials(name) || "?"}</AvatarFallback>
          </Avatar>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="flex items-center justify-end gap-3">
            <span aria-live="polite" className="text-sm font-semibold text-success">
              {saved ? "Saved" : ""}
            </span>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
