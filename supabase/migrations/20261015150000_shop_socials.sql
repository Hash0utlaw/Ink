-- Social links and website health for shops, TikTok for artists (filled by
-- scripts/socials/import.ts). Already applied to the live database by hand;
-- this file records it. Safe to re-run.

alter table public.shops add column if not exists tiktok_url text;
alter table public.shops add column if not exists youtube_url text;
alter table public.shops add column if not exists website_status text;
alter table public.shops add column if not exists website_checked_at timestamptz;
alter table public.artists add column if not exists tiktok_handle text;
