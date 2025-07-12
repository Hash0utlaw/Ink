"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Filter } from "lucide-react"

const shopSpecialties = ["Fine Line", "Botanical", "Blackwork", "Japanese", "Irezumi", "Watercolor", "Traditional"]

interface ShopFilterSidebarProps {
  filters: any
  onFilterChange: (filters: any) => void
}

export function ShopFilterSidebar({ filters, onFilterChange }: ShopFilterSidebarProps) {
  const handleStyleChange = (style: string) => {
    const newStyles = filters.styles.includes(style)
      ? filters.styles.filter((s: string) => s !== style)
      : [...filters.styles, style]
    onFilterChange({ ...filters, styles: newStyles })
  }

  return (
    <Card className="sticky top-20 bg-muted/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="text-accent" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Shop Specialties</Label>
          <div className="space-y-2">
            {shopSpecialties.map((style) => (
              <div key={style} className="flex items-center space-x-2">
                <Checkbox
                  id={`shop-${style}`}
                  checked={filters.styles.includes(style)}
                  onCheckedChange={() => handleStyleChange(style)}
                />
                <label
                  htmlFor={`shop-${style}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {style}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Minimum Rating</Label>
          <Slider
            min={0}
            max={5}
            step={0.1}
            value={[filters.rating]}
            onValueChange={(value) => onFilterChange({ ...filters, rating: value[0] })}
          />
          <div className="text-xs text-muted-foreground text-right">{filters.rating.toFixed(1)} stars & up</div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="accepts-walkins">Accepts Walk-ins</Label>
          <Switch
            id="accepts-walkins"
            checked={filters.acceptsWalkIns}
            onCheckedChange={(checked) => onFilterChange({ ...filters, acceptsWalkIns: checked })}
          />
        </div>
      </CardContent>
    </Card>
  )
}
