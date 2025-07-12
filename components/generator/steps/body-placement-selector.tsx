"use client"

import { cn } from "@/lib/utils"

const placements = [
  { name: "Head", path: "M45 15 A 10 10 0 1 1 55 15 L 55 15 A 10 10 0 1 1 45 15 Z" },
  { name: "Chest", path: "M40 30 L60 30 L60 45 L40 45 Z" },
  { name: "Arm", path: "M25 35 L40 35 L40 65 L25 65 Z" },
  { name: "Arm", path: "M60 35 L75 35 L75 65 L60 65 Z" },
  { name: "Stomach", path: "M40 45 L60 45 L60 60 L40 60 Z" },
  { name: "Leg", path: "M40 60 L50 60 L50 90 L40 90 Z" },
  { name: "Leg", path: "M50 60 L60 60 L60 90 L50 90 Z" },
]

interface BodyPlacementSelectorProps {
  selectedValue: string
  onSelect: (value: string) => void
}

export function BodyPlacementSelector({ selectedValue, onSelect }: BodyPlacementSelectorProps) {
  return (
    <svg viewBox="0 0 100 100" className="w-full max-w-[200px] mx-auto">
      <g className="stroke-muted-foreground stroke-1 fill-transparent">
        <circle cx="50" cy="20" r="10" />
        <path d="M40 30 L60 30 L60 60 L50 90 L40 60 Z" />
        <path d="M40 30 L25 35 L25 65 L40 60" />
        <path d="M60 30 L75 35 L75 65 L60 60" />
        <path d="M40 90 L50 90" />
      </g>
      {placements.map((p, i) => (
        <path
          key={i}
          d={p.path}
          className={cn(
            "fill-muted/50 hover:fill-accent/50 cursor-pointer transition-colors",
            selectedValue === p.name && "fill-accent",
          )}
          onClick={() => onSelect(p.name)}
        >
          <title>{p.name}</title>
        </path>
      ))}
    </svg>
  )
}
