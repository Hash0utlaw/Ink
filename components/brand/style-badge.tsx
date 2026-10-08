import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { StyleSymbol } from "./style-symbol"

interface StyleBadgeProps {
  slug: string
  label: string
  className?: string
}

/** A style chip: the secondary Badge with the style's symbol before the label. */
export function StyleBadge({ slug, label, className }: StyleBadgeProps) {
  return (
    <Badge variant="secondary" className={cn("gap-1.5", className)}>
      <StyleSymbol slug={slug} size={12} className="shrink-0" />
      {label}
    </Badge>
  )
}
