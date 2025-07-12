import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Search } from "lucide-react"
import { getUserData } from "@/lib/mock-data"

export default async function SavedDesignsPage() {
  const { savedDesigns } = await getUserData()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Designs</CardTitle>
        <CardDescription>Your collection of AI-generated and favorited tattoo designs.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedDesigns.map((design) => (
            <Card key={design.id} className="overflow-hidden group">
              <div className="aspect-square bg-muted">
                <img
                  src={design.imageUrl || "/placeholder.svg"}
                  alt={design.prompt}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <p className="text-sm font-medium truncate">{design.prompt}</p>
                <p className="text-xs text-muted-foreground">{design.style} Style</p>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" className="w-full">
                    <Search className="mr-2 h-4 w-4" /> Find Artist
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-500 hover:text-red-500 bg-transparent">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
