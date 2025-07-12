import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { getUserData } from "@/lib/mock-data"
import Link from "next/link"

export default async function FavoritesPage() {
  const { favoriteArtists, favoriteShops } = await getUserData()

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Favorite Artists</CardTitle>
          <CardDescription>Your saved list of talented artists.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {favoriteArtists.map((artist) => (
            <div key={artist.id} className="flex items-center gap-4 p-4 border rounded-lg">
              <Avatar className="w-12 h-12">
                <AvatarImage src={artist.avatarUrl || "/placeholder.svg"} />
                <AvatarFallback>{artist.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{artist.name}</p>
                <p className="text-sm text-muted-foreground">{artist.specialties.join(", ")}</p>
              </div>
              <Button asChild variant="secondary">
                <Link href={`/artists/${artist.id}`}>View</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Favorite Shops</CardTitle>
          <CardDescription>Your go-to list of top-rated shops.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {favoriteShops.map((shop) => (
            <div key={shop.id} className="flex items-center gap-4 p-4 border rounded-lg">
              <Avatar className="w-12 h-12">
                <AvatarImage src={shop.logoUrl || "/placeholder.svg"} />
                <AvatarFallback>{shop.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{shop.name}</p>
                <p className="text-sm text-muted-foreground">{shop.location.city}</p>
              </div>
              <Button asChild variant="secondary">
                <Link href={`/shops/${shop.id}`}>View</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
