import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * "Private studio" in navy with the calendar icon (Round 11). Only for artists
 * who said so themselves (artists.is_private_studio). The words are text; the
 * icon is decoration.
 */
export function PrivateStudioLabel({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-semibold text-navy", className)}>
      <Calendar className={cn("h-[15px] w-[15px] shrink-0", iconClassName)} strokeWidth={2} aria-hidden="true" />
      Private studio
    </span>
  )
}

/** "Kamil" from "Kamil Mocet"; the whole name when it's one word. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}
