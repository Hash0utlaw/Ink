import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AboutSectionProps {
  bio: string
  handle?: string
  isClaimed?: boolean
}

// isClaimed defaults to true so this component (also reused for shop bios,
// which have no claim concept) doesn't show an artist-claim prompt unless a
// caller explicitly passes isClaimed={false}.
export function AboutSection({ bio, handle, isClaimed = true }: AboutSectionProps) {
  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle>About the Artist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {bio ? (
          <p className="text-muted-foreground whitespace-pre-line">{bio}</p>
        ) : (
          <p className="text-muted-foreground italic text-sm">This artist hasn&apos;t added a bio yet.</p>
        )}
        {!isClaimed && (
          <p className="text-muted-foreground italic text-sm">
            Is this you?{" "}
            <a href={`/claim?artist=${handle}`} className="underline hover:text-foreground transition-colors">
              Claim this profile
            </a>{" "}
            to tell your story.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
