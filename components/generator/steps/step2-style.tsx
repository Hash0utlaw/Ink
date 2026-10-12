"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { FormState } from "@/types/generator"

interface StepProps {
  formData: FormState
  updateFormData: (data: Partial<FormState>) => void
}

const tattooStyles = [
  { name: "Realism", query: "photorealistic+tattoo" },
  { name: "Traditional", query: "american+traditional+tattoo" },
  { name: "Geometric", query: "geometric+tattoo" },
  { name: "Watercolor", query: "watercolor+tattoo" },
  { name: "Japanese", query: "japanese+irezumi+tattoo" },
  { name: "Fine Line", query: "fine+line+tattoo" },
]

export function Step2Style({ formData, updateFormData }: StepProps) {
  return (
    <div className="space-y-4 text-center">
      <h2 className="text-2xl font-bold">Choose a visual style</h2>
      <p className="text-muted-foreground">This will define the overall look and feel of your design.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
        {tattooStyles.map((style) => (
          <Card
            key={style.name}
            onClick={() => updateFormData({ style: style.name })}
            className={cn(
              "cursor-pointer transition-all duration-200",
              formData.style === style.name
                ? "border-ink ring-2 ring-ring"
                : "border-border hover:border-ink",
            )}
          >
            <CardContent className="p-0 aspect-square flex flex-col justify-end">
              <img
                src={`/abstract-geometric-shapes.png?height=200&width=200&query=${style.query}`}
                alt={style.name}
                className="w-full h-full object-cover absolute inset-0 rounded"
              />
              <div className="relative z-10 p-2 w-full rounded-b bg-night">
                <h3 className="font-bold text-cream text-center">{style.name}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
