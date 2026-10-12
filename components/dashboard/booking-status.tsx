import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const STATUS: Record<string, { label: string; swatch: string }> = {
  pending: { label: "Pending", swatch: "bg-warning" },
  confirmed: { label: "Confirmed", swatch: "bg-success" },
  completed: { label: "Completed", swatch: "bg-navy" },
  declined: { label: "Declined", swatch: "bg-destructive" },
  cancelled: { label: "Cancelled", swatch: "bg-destructive" },
}

/** A small square swatch in a status color, outlined in ink like a style symbol. */
export function StatusSwatch({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("h-2.5 w-2.5 shrink-0 border-1.5 border-ink", className)} />
}

/** Booking status as a chip: vellum, ink outline, a colored swatch before the label. */
export function BookingStatus({ status, className }: { status: string; className?: string }) {
  const s = STATUS[status] ?? { label: status, swatch: "bg-vellum" }
  return (
    <Badge variant="outline" className={cn("shrink-0 gap-1.5", className)}>
      <StatusSwatch className={s.swatch} />
      {s.label}
    </Badge>
  )
}
