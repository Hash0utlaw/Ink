-- By-appointment artists: artists who work privately (no public shop) get a
-- city-level location of their own, so the finder and the map can list them.
-- DRAFT for Step 6. Not applied.
--
-- Privacy rule: a private artist's location is a city center, never a street
-- address or an exact point.
--   * No address, ZIP or street column is added. Every artists column is public
--     (RLS "Artists are publicly readable" and to_jsonb(a) in the finder), so
--     nothing finer than a city may ever be stored here.
--   * area_latitude / area_longitude are numeric(5,2) / numeric(6,2): Postgres
--     rounds anything written to 2 decimals (about 1 km), so even a claimed artist
--     updating their own row through the API cannot store an exact point.
--   * scripts/by-appointment/import.ts fills them with the city center from our
--     own active shops (the same average /find-artist uses for "City, ST").
--
-- Artists with a shop are unchanged: they are found at their shop, and a shop
-- always wins over an artist's own city point (the private branch requires
-- shop_id is null). Until rows have works_by_appointment = true and a point,
-- all three functions return exactly what they return today.
--
-- Signatures are unchanged, so create or replace keeps the existing grants.

alter table public.artists
  add column if not exists works_by_appointment boolean not null default false,
  add column if not exists area_latitude numeric(5,2),
  add column if not exists area_longitude numeric(6,2);

alter table public.artists
  drop constraint if exists artists_area_point_pair,
  add constraint artists_area_point_pair
    check ((area_latitude is null) = (area_longitude is null)),
  drop constraint if exists artists_area_point_range,
  add constraint artists_area_point_range
    check (area_latitude between -90 and 90 and area_longitude between -180 and 180);

comment on column public.artists.works_by_appointment is
  'Works privately, by appointment, with no public shop. Never store a street address for these artists.';
comment on column public.artists.area_latitude is
  'City-center latitude (2 decimals) for artists without a shop. Never a home or studio address.';
comment on column public.artists.area_longitude is
  'City-center longitude (2 decimals) for artists without a shop. Never a home or studio address.';

create index if not exists artists_area_point_idx
  on public.artists (area_latitude, area_longitude)
  where is_active and shop_id is null and works_by_appointment and area_latitude is not null;

-- Finder: shop artists as before, plus by-appointment artists at their city
-- center. Private rows come back with "shops": null and "by_appointment": true;
-- the distance is to the city center.
create or replace function public.finder_artists_near(
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
  with pts as (
    select a, s, s.latitude::float8 as lat, s.longitude::float8 as lng, false as private
    from artists a
    join shops s on s.id = a.shop_id
    where a.is_active
      and s.is_active
      and not coalesce(s.possibly_closed, false)
      and s.latitude is not null
      and s.longitude is not null
      and s.latitude::float8 between p_lat - p_radius_mi / 69.0 and p_lat + p_radius_mi / 69.0
      and s.longitude::float8 between p_lng - p_radius_mi / (69.0 * greatest(cos(radians(p_lat)), 0.01))
                                   and p_lng + p_radius_mi / (69.0 * greatest(cos(radians(p_lat)), 0.01))
      and (p_styles is null or cardinality(p_styles) = 0 or a.styles && p_styles)
    union all
    select a, null::shops, a.area_latitude::float8, a.area_longitude::float8, true
    from artists a
    where a.is_active
      and a.shop_id is null
      and a.works_by_appointment
      and a.area_latitude is not null
      and a.area_longitude is not null
      and a.area_latitude::float8 between p_lat - p_radius_mi / 69.0 and p_lat + p_radius_mi / 69.0
      and a.area_longitude::float8 between p_lng - p_radius_mi / (69.0 * greatest(cos(radians(p_lat)), 0.01))
                                       and p_lng + p_radius_mi / (69.0 * greatest(cos(radians(p_lat)), 0.01))
      and (p_styles is null or cardinality(p_styles) = 0 or a.styles && p_styles)
  ),
  hits as (
    select pts.a, pts.s, pts.private, d.dist
    from pts
    cross join lateral (
      select 3958.8 * 2 * asin(least(1.0, sqrt(
        power(sin(radians(pts.lat - p_lat) / 2), 2)
        + cos(radians(p_lat)) * cos(radians(pts.lat))
        * power(sin(radians(pts.lng - p_lng) / 2), 2)
      ))) as dist
    ) d
    where d.dist <= p_radius_mi
  )
  select (to_jsonb(h.a) - 'claim_email')
         || jsonb_build_object(
              'distance_mi', round(h.dist::numeric, 1),
              'total_count', count(*) over (),
              'by_appointment', h.private,
              'shops', case when h.private then null else jsonb_build_object(
                'name', (h.s).name, 'address', (h.s).address, 'city', (h.s).city,
                'state', (h.s).state, 'latitude', (h.s).latitude, 'longitude', (h.s).longitude
              ) end
            )
  from hits h
  order by
    case when p_sort = 'followers' then (h.a).instagram_followers end desc nulls last,
    h.dist, ((h.a).avatar_url is null), (h.a).display_name, (h.a).id
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$function$;

create or replace function public.finder_style_counts_near(
  p_lat double precision,
  p_lng double precision,
  p_radius_mi double precision default 25
)
returns table(style text, artists integer)
language sql
stable
set search_path to 'public'
as $function$
  with pts as (
    select a.id, a.styles, s.latitude::float8 as lat, s.longitude::float8 as lng
    from artists a
    join shops s on s.id = a.shop_id
    where a.is_active
      and s.is_active
      and not coalesce(s.possibly_closed, false)
      and s.latitude is not null
      and s.longitude is not null
      and s.latitude::float8 between p_lat - p_radius_mi / 69.0 and p_lat + p_radius_mi / 69.0
      and s.longitude::float8 between p_lng - p_radius_mi / (69.0 * greatest(cos(radians(p_lat)), 0.01))
                                   and p_lng + p_radius_mi / (69.0 * greatest(cos(radians(p_lat)), 0.01))
    union all
    select a.id, a.styles, a.area_latitude::float8, a.area_longitude::float8
    from artists a
    where a.is_active
      and a.shop_id is null
      and a.works_by_appointment
      and a.area_latitude is not null
      and a.area_longitude is not null
      and a.area_latitude::float8 between p_lat - p_radius_mi / 69.0 and p_lat + p_radius_mi / 69.0
      and a.area_longitude::float8 between p_lng - p_radius_mi / (69.0 * greatest(cos(radians(p_lat)), 0.01))
                                       and p_lng + p_radius_mi / (69.0 * greatest(cos(radians(p_lat)), 0.01))
  ),
  near as (
    select pts.id, pts.styles
    from pts
    where 3958.8 * 2 * asin(least(1.0, sqrt(
            power(sin(radians(pts.lat - p_lat) / 2), 2)
            + cos(radians(p_lat)) * cos(radians(pts.lat))
            * power(sin(radians(pts.lng - p_lng) / 2), 2)
          ))) <= p_radius_mi
  )
  select '__all'::text, count(*)::int from near
  union all
  select '__none'::text, count(*)::int from near where coalesce(cardinality(styles), 0) = 0
  union all
  select x.st, count(distinct near.id)::int
  from near cross join lateral unnest(near.styles) as x(st)
  group by x.st;
$function$;

-- Older "near me" search (lib/supabase/artists.ts getArtistsNearMe): same rule.
create or replace function public.search_artists_near(
  p_lat double precision,
  p_lng double precision,
  p_radius_mi double precision default 25,
  p_min_rating double precision default 0,
  p_available boolean default null
)
returns setof jsonb
language sql
stable
set search_path to 'public'
as $function$
  with pts as (
    select a, s.name, s.address, s.city, s.state, s.latitude::float8 as lat, s.longitude::float8 as lng, false as private
    from artists a
    join shops s on s.id = a.shop_id
    where a.is_active
      and s.is_active
      and not coalesce(s.possibly_closed, false)
      and s.latitude is not null
      and s.longitude is not null
      and s.latitude::float8 between p_lat - p_radius_mi / 69.0 and p_lat + p_radius_mi / 69.0
      and s.longitude::float8 between p_lng - p_radius_mi / (69.0 * greatest(cos(radians(p_lat)), 0.01))
                                   and p_lng + p_radius_mi / (69.0 * greatest(cos(radians(p_lat)), 0.01))
    union all
    select a, null, null, null, null, a.area_latitude::float8, a.area_longitude::float8, true
    from artists a
    where a.is_active
      and a.shop_id is null
      and a.works_by_appointment
      and a.area_latitude is not null
      and a.area_longitude is not null
      and a.area_latitude::float8 between p_lat - p_radius_mi / 69.0 and p_lat + p_radius_mi / 69.0
      and a.area_longitude::float8 between p_lng - p_radius_mi / (69.0 * greatest(cos(radians(p_lat)), 0.01))
                                       and p_lng + p_radius_mi / (69.0 * greatest(cos(radians(p_lat)), 0.01))
  )
  select (to_jsonb(pts.a) - 'claim_email')
         || jsonb_build_object(
              'distance_mi', round(d.dist::numeric, 2),
              'by_appointment', pts.private,
              'shops', case when pts.private then null else jsonb_build_object('name', pts.name, 'address', pts.address, 'city', pts.city, 'state', pts.state) end
            )
  from pts
  cross join lateral (
    select 3958.8 * 2 * asin(least(1.0, sqrt(
      power(sin(radians(pts.lat - p_lat) / 2), 2)
      + cos(radians(p_lat)) * cos(radians(pts.lat))
      * power(sin(radians(pts.lng - p_lng) / 2), 2)
    ))) as dist
  ) d
  where d.dist <= p_radius_mi
    and coalesce((pts.a).rating, 0) >= coalesce(p_min_rating, 0)
    and (p_available is null or (pts.a).is_available = p_available)
  order by d.dist
  limit 200;
$function$;
