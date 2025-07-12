"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"
import { ResultsGallery } from "./results-gallery"
import { Step1Idea } from "./steps/step1-idea"
import { Step2Style } from "./steps/step2-style"
import { Step3Details } from "./steps/step3-details"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import type { FormState } from "@/types/generator"

const steps = [
  { id: 1, name: "The Idea", component: Step1Idea },
  { id: 2, name: "The Style", component: Step2Style },
  { id: 3, name: "The Details", component: Step3Details },
]

export function CreativeGenerator() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<FormState>({
    prompt: "",
    style: "",
    placement: "Arm",
    color: "black_and_gray",
    size: 50,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<string[]>([])
  const { toast } = useToast()

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const updateFormData = (newData: Partial<FormState>) => {
    setFormData((prev) => ({ ...prev, ...newData }))
  }

  const handleGenerate = async () => {
    setIsLoading(true)
    setResults([])

    try {
      const response = await fetch("/api/generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Something went wrong")
      }

      const data = await response.json()
      setResults(data.images)
    } catch (error) {
      toast({
        title: "Oh no! Something went wrong.",
        description: error instanceof Error ? error.message : "Failed to generate tattoo designs.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const CurrentStepComponent = steps[currentStep].component

  if (isLoading || results.length > 0) {
    return <ResultsGallery results={results} isLoading={isLoading} />
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="p-8 rounded-xl bg-secondary border border-border/50 shadow-lg">
        <div className="mb-6">
          <Progress value={((currentStep + 1) / steps.length) * 100} className="w-full" />
          <p className="text-center text-sm text-muted-foreground mt-2">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].name}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <CurrentStepComponent formData={formData} updateFormData={updateFormData} />
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex justify-between items-center">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
            Back
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext} disabled={!formData.prompt || (currentStep === 1 && !formData.style)}>
              Next
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate My Tattoo
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
