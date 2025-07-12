"use client"

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { MotionView } from "@/components/utils/motion-view"

export function StyleImageGallery({ images }: { images: string[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {images.map((src, i) => (
        <MotionView key={i} delay={i * 0.05}>
          <Dialog>
            <DialogTrigger asChild>
              <div className="group relative overflow-hidden rounded-lg aspect-square cursor-pointer">
                <img
                  src={src || "/placeholder.svg"}
                  alt={`Style example ${i + 1}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0 bg-transparent border-0">
              <img src={src || "/placeholder.svg"} alt="Selected style example" className="w-full h-auto rounded-lg" />
            </DialogContent>
          </Dialog>
        </MotionView>
      ))}
    </div>
  )
}
