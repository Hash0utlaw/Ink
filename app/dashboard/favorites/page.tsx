import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function FavoritesPage() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Favorite Artists</CardTitle>
          <CardDescription>Your saved list of talented artists.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-muted-foreground">No saved artists yet.</p>
            <Button asChild variant="secondary">
              <Link href="/artists">Browse Artists</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Favorite Shops</CardTitle>
          <CardDescription>Your go-to list of top-rated shops.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-muted-foreground">No saved shops yet.</p>
            <Button asChild variant="secondary">
              <Link href="/tattoo-shops">Browse Shops</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
