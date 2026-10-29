-- Pre-launch security, part 2.
--
-- Signed-in users (the "authenticated" role) may only change the columns their
-- dashboards edit. Everything else — trust fields, ownership, ratings, follower
-- counts, roles, billing — is written only by server code with the service role,
-- which bypasses RLS and these grants.
--
-- Column-level grants: a client UPDATE that names any other column fails with
-- "permission denied". Columns added later are not updatable by clients unless a
-- migration grants them.

-- ---------------------------------------------------------------------------
-- artists (#1, #2, #10)
-- ---------------------------------------------------------------------------
-- No client inserts. Artist rows come from imports or approved claims only.
drop policy if exists "Artists can insert their own profile" on public.artists;
revoke insert, delete, truncate on public.artists from anon, authenticated;

-- Dashboard edits: availability settings and profile photo / cover image.
-- Workplace (shop_id, is_private_studio, city, state, area point) is written by
-- /api/artist/workplace with the service role after its own checks.
revoke update on public.artists from anon, authenticated;
grant update (
  availability_status,
  avg_response_hours,
  price_tier,
  first_booking_discount,
  avatar_url,
  cover_image_url
) on public.artists to authenticated;

drop policy if exists "Artists can update their own profile" on public.artists;
create policy "Artists can update their own profile" on public.artists
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- shops (#2, #10)
-- ---------------------------------------------------------------------------
-- There is no shop dashboard yet, so shop owners edit nothing from the client.
-- Grant columns here when one exists.
revoke insert, update, delete, truncate on public.shops from anon, authenticated;

-- ---------------------------------------------------------------------------
-- user_profiles (#3)
-- ---------------------------------------------------------------------------
-- Users edit display_name, city, state and avatar_url. role, subscription_tier,
-- stripe_* and email are server-only (email follows auth.users, see below).
revoke insert, update, delete, truncate on public.user_profiles from anon, authenticated;
grant update (display_name, city, state, avatar_url) on public.user_profiles to authenticated;

drop policy if exists "Users can update their own profile" on public.user_profiles;
create policy "Users can update their own profile" on public.user_profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Email changes go through Supabase Auth (which confirms them); copy the
-- confirmed address to user_profiles so artist notifications use it.
create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.user_profiles set email = new.email where id = new.id;
  return new;
end;
$$;
revoke execute on function public.sync_user_email() from public, anon, authenticated;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_user_email();

-- ---------------------------------------------------------------------------
-- booking_requests (#9)
-- ---------------------------------------------------------------------------
-- /api/bookings inserts with the service role after its own checks.
drop policy if exists "Anyone can create a booking request" on public.booking_requests;
revoke insert, delete, truncate on public.booking_requests from anon, authenticated;

-- The artist's appointments page changes the status only.
revoke update on public.booking_requests from anon, authenticated;
grant update (status) on public.booking_requests to authenticated;

drop policy if exists "Artists can update booking status" on public.booking_requests;
create policy "Artists can update booking status" on public.booking_requests
  for update to authenticated
  using (auth.uid() = (select a.user_id from public.artists a where a.id = booking_requests.artist_id))
  with check (auth.uid() = (select a.user_id from public.artists a where a.id = booking_requests.artist_id));

-- ---------------------------------------------------------------------------
-- claim_requests (#9)
-- ---------------------------------------------------------------------------
-- /api/claims inserts with the service role after its own checks.
drop policy if exists "Anyone can submit a claim" on public.claim_requests;
revoke insert, update, delete, truncate on public.claim_requests from anon, authenticated;

-- ---------------------------------------------------------------------------
-- reviews (#5)
-- ---------------------------------------------------------------------------
-- /api/reviews inserts with the service role after checking the signed link.
-- (One review per booking and rating 1–5 are already constraints.)
revoke insert, update, delete, truncate on public.reviews from anon, authenticated;

-- ---------------------------------------------------------------------------
-- handle_new_user (#16, #15)
-- ---------------------------------------------------------------------------
-- Sign-up metadata may only pick 'client' or 'artist'; anything else is 'client'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id, email, role, display_name)
  values (
    new.id,
    new.email,
    case when new.raw_user_meta_data->>'role' in ('client', 'artist')
      then new.raw_user_meta_data->>'role'
      else 'client'
    end,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function search_path and EXECUTE (#15)
-- ---------------------------------------------------------------------------
create or replace function public.update_artist_rating(p_artist_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.artists
  set
    rating = coalesce((
      select round(avg(r.rating)::numeric, 1)
      from public.reviews r
      where r.artist_id = p_artist_id and r.is_verified = true
    ), 0),
    review_count = (
      select count(*)
      from public.reviews r
      where r.artist_id = p_artist_id and r.is_verified = true
    )
  where id = p_artist_id;
end;
$$;

alter function public.handle_updated_at() set search_path = '';
-- Invoker function over public.shops with unqualified names; pin to public.
alter function public.search_shops_near(double precision, double precision, double precision, double precision, boolean)
  set search_path = public;

revoke execute on function public.update_artist_rating(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.update_artist_rating(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Rate limits for public forms (#4, #8)
-- ---------------------------------------------------------------------------
-- One row per accepted attempt. key is a SHA-256 hash of the IP or email (never
-- the raw value). Service role only: RLS on, no policies, no client grants.
create table if not exists public.rate_limit_events (
  id bigint generated always as identity primary key,
  bucket text not null,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_events_lookup on public.rate_limit_events (bucket, key, created_at);
create index if not exists rate_limit_events_created_at on public.rate_limit_events (created_at);
alter table public.rate_limit_events enable row level security;
revoke all on public.rate_limit_events from anon, authenticated;

-- Records an attempt and returns true when under the limit; false (and records
-- nothing) when the window is full. The advisory lock makes check-and-insert
-- atomic for one bucket+key. Old rows (older than 2 days) are pruned.
create or replace function public.rate_limit_hit(
  p_bucket text,
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_bucket || ':' || p_key, 0));

  select count(*) into recent
  from public.rate_limit_events
  where bucket = p_bucket
    and key = p_key
    and created_at > now() - make_interval(secs => p_window_seconds);

  if recent >= p_limit then
    return false;
  end if;

  insert into public.rate_limit_events (bucket, key) values (p_bucket, p_key);
  delete from public.rate_limit_events where created_at < now() - interval '2 days';
  return true;
end;
$$;
revoke execute on function public.rate_limit_hit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, text, integer, integer) to service_role;
