"use client"

import { useEffect, useId, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type WorkplaceValue = "unchanged" | "shop" | "private_studio"

export interface PickedShop {
  id: string
  name: string
  city: string
  state: string
}

const OPTIONS: { value: WorkplaceValue; label: string }[] = [
  { value: "shop", label: "At a shop" },
  { value: "private_studio", label: "Private studio" },
  { value: "unchanged", label: "Leave as is" },
]

interface WorkplaceChoiceProps {
  value: WorkplaceValue
  onChange: (value: WorkplaceValue) => void
  shop: PickedShop | null
  onShopChange: (shop: PickedShop | null) => void
  disabled?: boolean
}

/**
 * "Where do you work?": at a shop (picked from our listed shops), a private
 * studio (city only) or leave as is. There is no address field, on purpose.
 */
export function WorkplaceChoice({ value, onChange, shop, onShopChange, disabled }: WorkplaceChoiceProps) {
  const id = useId()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PickedShop[]>([])
  const [searching, setSearching] = useState(false)

  // Listed shops whose name matches, after a short pause in typing.
  useEffect(() => {
    if (value !== "shop" || query.trim().length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/shops?query=${encodeURIComponent(query.trim())}&page=0`)
        const json = res.ok ? await res.json() : { data: [] }
        if (cancelled) return
        const rows = (json.data ?? []) as { id: string; name: string; location?: { city?: string; state?: string } }[]
        setResults(rows.slice(0, 8).map((s) => ({ id: s.id, name: s.name, city: s.location?.city ?? "", state: s.location?.state ?? "" })))
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, value])

  return (
    <div className="space-y-4">
      <fieldset disabled={disabled}>
        <legend className="mb-2 text-sm font-semibold text-ink">Where do you work?</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {OPTIONS.map((opt) => {
            const on = value === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(opt.value)}
                className={cn(
                  "flex min-h-11 items-center rounded border-1.5 border-ink px-3 text-left text-[15px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  on ? "bg-ink text-vellum" : "bg-vellum tex-vellum text-ink hover:bg-secondary",
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      {value === "private_studio" && (
        <p className="text-sm text-ink-muted text-pretty">
          Your page shows &ldquo;Private studio&rdquo; and your city. Clients get your address from you once a booking is
          set. We never ask for a home address.
        </p>
      )}

      {value === "shop" && (
        <div className="space-y-2">
          <label htmlFor={`${id}-shop`} className="block text-sm font-semibold text-ink">
            Your shop
          </label>
          {shop ? (
            <div className="flex flex-wrap items-center gap-3 rounded border-1.5 border-ink bg-vellum tex-vellum px-3 py-2 text-[15px]">
              <span className="font-semibold">{shop.name}</span>
              {shop.city && (
                <span className="font-place italic text-ink-muted">
                  {shop.city}
                  {shop.state ? `, ${shop.state}` : ""}
                </span>
              )}
              <button
                type="button"
                onClick={() => onShopChange(null)}
                className="ml-auto min-h-11 font-semibold text-navy underline underline-offset-2 hover:no-underline"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <Input
                id={`${id}-shop`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search listed shops by name"
                className="h-11 border-1.5 border-ink bg-white text-base"
                disabled={disabled}
                autoComplete="off"
              />
              {searching && <p className="text-sm text-ink-muted">Searching...</p>}
              {results.length > 0 && (
                <ul className="rounded border-1.5 border-ink bg-vellum tex-vellum">
                  {results.map((s) => (
                    <li key={s.id} className="border-b border-rule last:border-b-0">
                      <button
                        type="button"
                        onClick={() => onShopChange(s)}
                        className="flex min-h-11 w-full flex-wrap items-center gap-x-2 px-3 py-2 text-left text-[15px] hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        <span className="font-semibold">{s.name}</span>
                        {s.city && (
                          <span className="font-place italic text-ink-muted">
                            {s.city}
                            {s.state ? `, ${s.state}` : ""}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <p className="text-sm text-ink-muted">No listed shop by that name. Choose Leave as is and email us to add it.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
