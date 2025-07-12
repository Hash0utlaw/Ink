import { MotionView } from "@/components/utils/motion-view"

interface StyleHeaderProps {
  title: string
  description: string
}

export function StyleHeader({ title, description }: StyleHeaderProps) {
  return (
    <MotionView>
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">{description}</p>
      </div>
    </MotionView>
  )
}
