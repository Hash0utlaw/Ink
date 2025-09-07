"use client"

import { MotionView } from "@/components/utils/motion-view"

interface StyleHeaderProps {
  title: string
  description: string
}

export function StyleHeader({ title, description }: StyleHeaderProps) {
  return (
    <MotionView className="text-center mb-12">
      <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">{title}</h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">{description}</p>
    </MotionView>
  )
}
