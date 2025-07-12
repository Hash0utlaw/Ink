"use client"

import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { BodyPlacementSelector } from "./body-placement-selector"
import type { FormState } from "@/types/generator"

interface StepProps {
  formData: FormState
  updateFormData: (data: Partial<FormState>) => void
}

export function Step3Details({ formData, updateFormData }: StepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Final Details</h2>
        <p className="text-muted-foreground">Select the placement and color for your design.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <div>
            <Label className="mb-2 block text-center">Color Preference</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={formData.color}
              onValueChange={(value: FormState["color"]) => value && updateFormData({ color: value })}
              className="w-full"
            >
              <ToggleGroupItem value="black_and_gray" className="w-1/2">
                Black & Gray
              </ToggleGroupItem>
              <ToggleGroupItem value="full_color" className="w-1/2">
                Full Color
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div>
            <Label htmlFor="size" className="mb-2 block text-center">
              Approximate Size
            </Label>
            <Slider
              id="size"
              min={10}
              max={100}
              step={10}
              value={[formData.size]}
              onValueValueChange={(value) => updateFormData({ size: value[0] })}
            />
            <div className="text-xs text-muted-foreground text-right mt-1">{formData.size}% of placement area</div>
          </div>
        </div>
        <div>
          <Label className="mb-2 block text-center">Placement</Label>
          <BodyPlacementSelector
            selectedValue={formData.placement}
            onSelect={(value) => updateFormData({ placement: value })}
          />
        </div>
      </div>
    </div>
  )
}
