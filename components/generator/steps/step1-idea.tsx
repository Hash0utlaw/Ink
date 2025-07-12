"use client"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { FormState } from "@/types/generator"

interface StepProps {
  formData: FormState
  updateFormData: (data: Partial<FormState>) => void
}

export function Step1Idea({ formData, updateFormData }: StepProps) {
  return (
    <div className="space-y-4 text-center">
      <h2 className="text-2xl font-bold">Let's start with your idea</h2>
      <p className="text-muted-foreground">
        Describe the main subject and elements of your tattoo. Be as descriptive as you like!
      </p>
      <div className="pt-4">
        <Label htmlFor="prompt" className="sr-only">
          Describe your tattoo
        </Label>
        <Textarea
          id="prompt"
          placeholder="e.g., A majestic lion wearing a crown of stars, a delicate hummingbird sipping nectar from a lotus flower, a vintage motorcycle on a desert highway..."
          value={formData.prompt}
          onChange={(e) => updateFormData({ prompt: e.target.value })}
          rows={5}
          className="text-base"
        />
      </div>
    </div>
  )
}
