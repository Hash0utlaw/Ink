import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AboutSection({ bio }: { bio: string }) {
  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle>About the Artist</CardTitle>
      </CardHeader>
      <CardContent>
        {bio ? (
          <p className="text-muted-foreground whitespace-pre-line">{bio}</p>
        ) : (
          <p className="text-muted-foreground italic text-sm">
            This artist hasn&apos;t added a bio yet. If this is you,{" "}
            <a href="/claim" className="underline hover:text-foreground transition-colors">
              claim your profile
            </a>{" "}
            to tell your story.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
