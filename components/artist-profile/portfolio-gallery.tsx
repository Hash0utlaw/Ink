"use client"

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

export function PortfolioGallery({ images }: { images: string[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {images.map((src, i) => (
        <Dialog key={i}>
          <DialogTrigger asChild>
            <div className="group relative overflow-hidden rounded-lg aspect-square cursor-pointer">
              <img
                src={src || "/placeholder.svg"}
                alt={`Portfolio piece ${i + 1}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-3xl p-0">
            <img src={src || ""} alt="Selected portfolio piece" className="w-full h-auto rounded-lg" />
          </DialogContent>
        </Dialog>
      ))}
    </div>
  )
}
