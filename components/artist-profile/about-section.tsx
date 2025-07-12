import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AboutSection({ bio }: { bio: string }) {
  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle>About the Artist</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground whitespace-pre-line">{bio}</p>
      </CardContent>
    </Card>
  )
}
