-- Profile photos and cover images uploaded by claimed owners.
--
-- 1. artists.cover_image_url (shops already have cover_image_url and logo_url).
-- 2. Owner-only uploads in the public "portfolio" bucket under:
--      avatars/{artist_id}/...   covers/{artist_id}/...   shops/{shop_id}/...
--    Owner = artists.user_id or shops.owner_user_id equal to auth.uid().
--
-- The bucket already has a permissive INSERT policy ("Artists can upload portfolio
-- images") that lets any authenticated user insert anywhere in it. Permissive
-- policies are OR'd, so an owner-only permissive policy alone would not stop
-- someone writing into another artist's covers/ folder. The RESTRICTIVE policies
-- below are AND'd with every permissive one, and apply only to the three prefixes
-- above, so other paths keep their current behavior. Public read is unchanged
-- ("Portfolio images are publicly accessible").

alter table public.artists add column if not exists cover_image_url text;

-- True when the signed-in user owns the artist or shop named by an object path.
-- security definer: reads artists/shops regardless of their RLS (e.g. an inactive
-- profile); search_path is empty so every name is schema-qualified.
create or replace function public.owns_profile_image_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case (storage.foldername(object_name))[1]
    when 'avatars' then exists (
      select 1 from public.artists a
      where a.id::text = (storage.foldername(object_name))[2] and a.user_id = auth.uid()
    )
    when 'covers' then exists (
      select 1 from public.artists a
      where a.id::text = (storage.foldername(object_name))[2] and a.user_id = auth.uid()
    )
    when 'shops' then exists (
      select 1 from public.shops s
      where s.id::text = (storage.foldername(object_name))[2] and s.owner_user_id = auth.uid()
    )
    else false
  end
$$;

revoke all on function public.owns_profile_image_path(text) from public;
-- anon too: the restrictive policies below run for every role (it returns false without a user).
grant execute on function public.owns_profile_image_path(text) to anon, authenticated;

-- Permissive: the owner may upload, replace and delete their own files.
create policy "Owners can upload profile images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] in ('avatars', 'covers', 'shops')
    and public.owns_profile_image_path(name)
  );

create policy "Owners can replace profile images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] in ('avatars', 'covers', 'shops')
    and public.owns_profile_image_path(name)
  )
  with check (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] in ('avatars', 'covers', 'shops')
    and public.owns_profile_image_path(name)
  );

create policy "Owners can delete profile images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] in ('avatars', 'covers', 'shops')
    and public.owns_profile_image_path(name)
  );

-- Restrictive: nobody else may write under those prefixes, whatever other
-- permissive policies allow. Paths outside them pass through unchanged.
create policy "Only owners write profile images (insert)"
  on storage.objects as restrictive for insert to public
  with check (
    bucket_id <> 'portfolio'
    or coalesce((storage.foldername(name))[1], '') not in ('avatars', 'covers', 'shops')
    or public.owns_profile_image_path(name)
  );

create policy "Only owners write profile images (update)"
  on storage.objects as restrictive for update to public
  using (
    bucket_id <> 'portfolio'
    or coalesce((storage.foldername(name))[1], '') not in ('avatars', 'covers', 'shops')
    or public.owns_profile_image_path(name)
  )
  with check (
    bucket_id <> 'portfolio'
    or coalesce((storage.foldername(name))[1], '') not in ('avatars', 'covers', 'shops')
    or public.owns_profile_image_path(name)
  );

create policy "Only owners write profile images (delete)"
  on storage.objects as restrictive for delete to public
  using (
    bucket_id <> 'portfolio'
    or coalesce((storage.foldername(name))[1], '') not in ('avatars', 'covers', 'shops')
    or public.owns_profile_image_path(name)
  );
