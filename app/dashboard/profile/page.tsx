import { redirect } from "next/navigation"
import { getCurrentUserId, getUserProfile } from "@/lib/supabase/users"
import { ProfileForm } from "@/components/dashboard/profile-form"

export default async function ProfilePage() {
  const userId = await getCurrentUserId()
  if (!userId) redirect("/login?next=/dashboard/profile")

  const profile = await getUserProfile(userId)

  return (
    <ProfileForm
      initialName={profile?.name ?? ""}
      initialEmail={profile?.email ?? ""}
      initialLocation={profile?.location ?? ""}
      avatarUrl={profile?.avatarUrl ?? ""}
    />
  )
}
