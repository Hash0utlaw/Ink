-- Profile photos and cover images uploaded by claimed owners, and a tighter
-- "portfolio" bucket.
--
-- 1. artists.cover_image_url (shops already have cover_image_url and logo_url).
-- 2. Owner-only uploads in the public "portfolio" bucket under:
--      avatars/{artist_id}/...   covers/{artist_id}/...   shops/{shop_id}/...
--    Owner = artists.user_id or shops.owner_user_id equal to auth.uid().
-- 3. The old "Artists can upload portfolio images" policy let any signed-in user
--    insert anywhere in the bucket. It's replaced by one that allows only the
--    user's own folder ({auth.uid()}/..., the convention the existing delete policy
--    expects) or the owner-checked folders above. No app code writes elsewhere,
--    and the bucket held no files when this was written (2026-10-09).
-- 4. Bucket limits: 5 MB, JPG/PNG/WebP only (it already allowed only those types).
-- Public read is unchanged ("Portfolio images are publicly accessible").

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

-- Uploads: the user's own folder, or a profile-image folder they own.
drop policy if exists "Artists can upload portfolio images" on storage.objects;

create policy "Artists can upload portfolio images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolio'
    and (
      (storage.foldername(name))[1] = (auth.uid())::text
      or (
        (storage.foldername(name))[1] in ('avatars', 'covers', 'shops')
        and public.owns_profile_image_path(name)
      )
    )
  );

-- The owner may replace and delete their own profile images.
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

-- Restrictive, as a backstop: nobody else may write under those prefixes, even if
-- a broader permissive policy is added later. Paths outside them pass through.
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

-- 5 MB, JPG/PNG/WebP (was 10 MB with the same types).
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = '{image/jpeg,image/png,image/webp}'
where id = 'portfolio';
