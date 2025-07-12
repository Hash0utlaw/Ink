import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { getArtistById } from "@/lib/mock-data"

export default async function EditProfilePage() {
  const artist = await getArtistById("1") // Assuming we're editing Valerie's profile

  if (!artist) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
        <CardDescription>Keep your public profile up-to-date.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <Input id="name" defaultValue={artist.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Biography</Label>
          <Textarea id="bio" defaultValue={artist.bio} rows={6} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="specialties">Specialties (comma-separated)</Label>
          <Input id="specialties" defaultValue={artist.specialties.join(", ")} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="availability" className="text-base">
              Open for Bookings
            </Label>
            <p className="text-sm text-muted-foreground">Enable this to show you are available for new appointments.</p>
          </div>
          <Switch id="availability" defaultChecked={artist.isAvailable} />
        </div>
        <div className="flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  )
}
