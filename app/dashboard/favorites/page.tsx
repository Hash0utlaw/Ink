import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArtistCard } from "@/components/artists/artist-card"
import { ShopCard } from "@/components/shops/shop-card"
import Link from "next/link"
import { getCurrentUserId } from "@/lib/supabase/users"
import { getSavedItems } from "@/lib/supabase/saved"

function EmptyFavorites({ text, href, action }: { text: string; href: string; action: string }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <p className="font-semibold text-ink">{text}</p>
        <Button asChild variant="outline">
          <Link href={href}>{action}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default async function FavoritesPage() {
  const userId = await getCurrentUserId()
  const { artists, shops } = userId ? await getSavedItems(userId) : { artists: [], shops: [] }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-[30px] leading-tight text-balance md:text-[34px]">Favorites</h1>
      <Tabs defaultValue="artists">
        <TabsList>
          <TabsTrigger value="artists">Artists</TabsTrigger>
          <TabsTrigger value="shops">Shops</TabsTrigger>
        </TabsList>

        <TabsContent value="artists" className="mt-6">
          {artists.length === 0 ? (
            <EmptyFavorites text="No saved artists yet." href="/artists" action="Browse artists" />
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
            <EmptyFavorites text="No saved shops yet." href="/tattoo-shops" action="Browse shops" />
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
