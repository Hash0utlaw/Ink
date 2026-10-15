-- Artist portfolios and the "Most followed" sort.
--
-- 1. portfolio_images: is_active (hide, never delete) and updated_at, plus an
--    index for the public portfolio query (active photos in display_order).
-- 2. Hide the 1,332 photos imported in June 2026 that are hotlinked from
--    Tattoodo's CDN. The public portfolio shows only work uploaded to
--    TattooMaps. Nothing is deleted; to show them again:
--      update public.portfolio_images set is_active = true
--      where split_part(image_url, '/', 3) = 'd1kq2dqeox7x40.cloudfront.net';
-- 3. finder_artists_near gains p_sort. 'followers' orders by Instagram
--    followers (most first, unknown last), then the usual order. Adding a
--    parameter changes the signature, so the old function is dropped and
--    recreated; the body is otherwise unchanged.
--
-- The storage bucket is not changed (5 MB, jpeg/png/webp).

alter table public.portfolio_images
  add column if not exists is_active boolean not null default true;
alter table public.portfolio_images
  add column if not exists updated_at timestamptz not null default now();

create index if not exists portfolio_images_artist_order_idx
  on public.portfolio_images (artist_id, display_order)
  where is_active;

update public.portfolio_images
   set is_active = false, updated_at = now()
 where is_active
   and split_part(image_url, '/', 3) = 'd1kq2dqeox7x40.cloudfront.net';

drop function if exists public.finder_artists_near(double precision, double precision, double precision, text[], integer, integer);

create function public.finder_artists_near(
  p_lat double precision,
  p_lng double precision,
  p_radius_mi double precision default 25,
  p_styles text[] default null,
  p_limit integer default 24,
  p_offset integer default 0,
  p_sort text default 'distance'
)
returns setof jsonb
language sql
stable
set search_path to 'public'
as $function$
  with hits as (
    select a, s, d.dist
    from artists a
    join shops s on s.id = a.shop_id
    cross join lateral (
      select 3958.8 * 2 * asin(least(1.0, sqrt(
        power(sin(radians(s.latitude::float8 - p_lat) / 2), 2)
        + cos(radians(p_lat)) * cos(radians(s.latitude::float8))
        * power(sin(radians(s.longitude::float8 - p_lng) / 2), 2)
      ))) as dist
    ) d
    where a.is_active
      and s.is_active
      and not coalesce(s.possibly_closed, false)
      and s.latitude is not null
      and s.longitude is not null
      and s.latitude::float8 between p_lat - p_radius_mi / 69.0 and p_lat + p_radius_mi / 69.0
      and s.longitude::float8 between p_lng - p_radius_mi / (69.0 * greatest(cos(radians(p_lat)), 0.01))
                                   and p_lng + p_radius_mi / (69.0 * greatest(cos(radians(p_lat)), 0.01))
      and d.dist <= p_radius_mi
      and (p_styles is null or cardinality(p_styles) = 0 or a.styles && p_styles)
  )
  select (to_jsonb(h.a) - 'claim_email')
         || jsonb_build_object(
              'distance_mi', round(h.dist::numeric, 1),
              'total_count', count(*) over (),
              'shops', jsonb_build_object(
                'name', (h.s).name, 'address', (h.s).address, 'city', (h.s).city,
                'state', (h.s).state, 'latitude', (h.s).latitude, 'longitude', (h.s).longitude
              )
            )
  from hits h
  order by
    case when p_sort = 'followers' then (h.a).instagram_followers end desc nulls last,
    h.dist, ((h.a).avatar_url is null), (h.a).display_name, (h.a).id
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$function$;

grant execute on function public.finder_artists_near(double precision, double precision, double precision, text[], integer, integer, text) to anon, authenticated;
