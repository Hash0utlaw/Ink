-- Profile details editor (Round 12).
--
-- Additive only. booking_url, display_name, bio, styles, instagram_handle,
-- tiktok_handle and website_url already exist and are reused.
--
-- accepting_clients replaces availability_status for "Are you taking new
-- clients?": availability_status has no waitlist value. availability_status is
-- kept as it is; nothing in the app reads it after this change.
--
-- No grants: these columns are written only by /api/artist/profile with the
-- service role after its own checks. The column grants from
-- 20261028120000_prelaunch_security.sql stay exactly as they are.

alter table public.artists
  add column if not exists accepting_clients text not null default 'yes',
  add column if not exists shop_minimum integer,
  add column if not exists hourly_rate_min integer,
  add column if not exists hourly_rate_max integer,
  add column if not exists pricing_notes text;

alter table public.artists
  drop constraint if exists artists_accepting_clients_check,
  add constraint artists_accepting_clients_check
    check (accepting_clients in ('yes', 'waitlist', 'no'));

alter table public.artists
  drop constraint if exists artists_prices_check,
  add constraint artists_prices_check check (
    (shop_minimum is null or shop_minimum between 0 and 10000)
    and (hourly_rate_min is null or hourly_rate_min between 0 and 10000)
    and (hourly_rate_max is null or hourly_rate_max between 0 and 10000)
    and (hourly_rate_min is null or hourly_rate_max is null or hourly_rate_min <= hourly_rate_max)
  );

alter table public.artists
  drop constraint if exists artists_pricing_notes_length,
  add constraint artists_pricing_notes_length check (pricing_notes is null or char_length(pricing_notes) <= 200);

-- Carry over anyone who already said they aren't taking clients (0 rows today).
update public.artists
  set accepting_clients = 'no'
  where availability_status = 'not_taking_clients' and accepting_clients = 'yes';
