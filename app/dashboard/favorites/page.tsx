import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArtistCard } from "@/components/artists/artist-card"
import { ShopCard } from "@/components/shops/shop-card"
import Link from "next/link"
import { getCurrentUserId } from "@/lib/supabase/users"
import { getSavedItems } from "@/lib/supabase/saved"

export default async function FavoritesPage() {
  const userId = await getCurrentUserId()
  const { artists, shops } = userId ? await getSavedItems(userId) : { artists: [], shops: [] }

  return (
    <div className="space-y-8">
      <Tabs defaultValue="artists">
        <TabsList>
          <TabsTrigger value="artists">Artists</TabsTrigger>
          <TabsTrigger value="shops">Shops</TabsTrigger>
        </TabsList>

        <TabsContent value="artists" className="mt-6">
          {artists.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Favorite Artists</CardTitle>
                <CardDescription>Your saved list of talented artists.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-muted-foreground">You haven&apos;t saved anyone yet.</p>
                  <Button asChild variant="secondary">
                    <Link href="/artists">Browse Artists</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {artists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} initialSaved />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shops" className="mt-6">
          {shops.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Favorite Shops</CardTitle>
                <CardDescription>Your go-to list of top-rated shops.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-muted-foreground">You haven&apos;t saved anyone yet.</p>
                  <Button asChild variant="secondary">
                    <Link href="/tattoo-shops">Browse Shops</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {shops.map((shop) => (
                <ShopCard key={shop.id} shop={shop} initialSaved />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
