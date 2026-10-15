-- Instagram follower counts for artists and shops (filled by scripts/tw/import.ts
-- from TattoosWizard). Already applied to the live database by hand; this file
-- records it. Safe to re-run.

alter table public.artists add column if not exists instagram_followers integer;
alter table public.artists add column if not exists instagram_checked_at timestamptz;
alter table public.shops add column if not exists instagram_followers integer;
alter table public.shops add column if not exists instagram_checked_at timestamptz;

create index if not exists artists_instagram_followers_idx
  on public.artists (instagram_followers desc nulls last)
  where is_active;
