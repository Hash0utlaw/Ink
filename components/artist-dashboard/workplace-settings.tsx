"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorkplaceChoice, type PickedShop, type WorkplaceValue } from "./workplace-choice"

interface WorkplaceSettingsProps {
  /** The shop the profile is listed at now, if any. */
  currentShopName: string | null
  isPrivateStudio: boolean
}

/** Dashboard card body: "Where do you work?", saved to /api/artist/workplace. */
export function WorkplaceSettings({ currentShopName, isPrivateStudio }: WorkplaceSettingsProps) {
  const router = useRouter()
  const [value, setValue] = useState<WorkplaceValue>("unchanged")
  const [shop, setShop] = useState<PickedShop | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const now = currentShopName ? `Listed at ${currentShopName}.` : isPrivateStudio ? "Listed as a private studio." : "No studio listed yet."

  async function save() {
    if (value === "unchanged") return
    if (value === "shop" && !shop) {
      setError("Pick the shop you work at.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/artist/workplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workplace: value, shopId: shop?.id ?? null }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? "Save failed")
        return
      }
      setSaved(true)
      setValue("unchanged")
      setShop(null)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-[15px] text-ink">{now}</p>
      <WorkplaceChoice value={value} onChange={setValue} shop={shop} onShopChange={setShop} disabled={saving} />
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving || value === "unchanged"}>
          {saving ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            "Save where you work"
          )}
        </Button>
        <span aria-live="polite" className="text-sm font-semibold text-success">
          {saved ? "Saved" : ""}
        </span>
      </div>
    </div>
  )
}
