"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Filter } from "lucide-react"

const tattooStyles = [
  "Fine Line",
  "Botanical",
  "Blackwork",
  "Japanese",
  "Irezumi",
  "Watercolor",
  "Abstract",
  "Traditional",
  "Old School",
]

interface FilterSidebarProps {
  filters: any
  onFilterChange: (filters: any) => void
}

export function FilterSidebar({ filters, onFilterChange }: FilterSidebarProps) {
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
          <Label>Styles</Label>
          <div className="space-y-2">
            {tattooStyles.slice(0, 5).map((style) => (
              <div key={style} className="flex items-center space-x-2">
                <Checkbox
                  id={style}
                  checked={filters.styles.includes(style)}
                  onCheckedChange={() => handleStyleChange(style)}
                />
                <label
                  htmlFor={style}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {style}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Price Range</Label>
          <ToggleGroup
            type="multiple"
            variant="outline"
            value={filters.price}
            onValueChange={(value) => onFilterChange({ ...filters, price: value })}
            className="w-full"
          >
            <ToggleGroupItem value="low" className="w-1/3 text-xs px-2">
              $
            </ToggleGroupItem>
            <ToggleGroupItem value="medium" className="w-1/3 text-xs px-2">
              $$
            </ToggleGroupItem>
            <ToggleGroupItem value="high" className="w-1/3 text-xs px-2">
              $$$
            </ToggleGroupItem>
          </ToggleGroup>
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
          <Label htmlFor="available-now">Available Now</Label>
          <Switch
            id="available-now"
            checked={filters.availableNow}
            onCheckedChange={(checked) => onFilterChange({ ...filters, availableNow: checked })}
          />
        </div>
      </CardContent>
    </Card>
  )
}
