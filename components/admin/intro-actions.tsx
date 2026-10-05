"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import {
  approveClaim,
  markClaimed,
  markClosed,
  markContacted,
  rejectClaim,
  type ActionResult,
} from "@/app/admin/intros/actions"

function useRunAction() {
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()

  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => {
      try {
        const result = await action()
        if (result.ok) toast({ description: result.message })
        else toast({ description: result.error, variant: "destructive" })
      } catch {
        toast({ description: "Something went wrong. Please try again.", variant: "destructive" })
      }
    })

  return { pending, run }
}

export function CopyOutreachButton({ message }: { message: string }) {
  const { toast } = useToast()
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(message)
          toast({ description: "Outreach message copied" })
        } catch {
          toast({ description: "Couldn't copy — select the text manually.", variant: "destructive" })
        }
      }}
    >
      Copy outreach message
    </Button>
  )
}

export function IntroStatusButtons({ bookingId }: { bookingId: string }) {
  const { pending, run } = useRunAction()
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => markContacted(bookingId))}>
        Mark contacted
      </Button>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => markClaimed(bookingId))}>
        Mark claimed
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => markClosed(bookingId))}>
        Mark closed
      </Button>
    </div>
  )
}

export function ClaimReviewButtons({ claimId }: { claimId: string }) {
  const { pending, run } = useRunAction()
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={pending} onClick={() => run(() => approveClaim(claimId))}>
        Approve
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => rejectClaim(claimId))}>
        Reject
      </Button>
    </div>
  )
}
