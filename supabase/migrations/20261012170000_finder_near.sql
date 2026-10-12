-- Artist finder: nearest artists with an optional style filter, and style
-- counts near a point. Read-only, invoker rights (RLS applies), new names so
-- search_artists_near and search_shops_near are untouched.

create or replace function public.finder_artists_near(
  p_lat double precision,
  p_lng double precision,
  p_radius_mi double precision default 25,
  p_styles text[] default null,
  p_limit integer default 24,
  p_offset integer default 0
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
  order by h.dist, ((h.a).avatar_url is null), (h.a).display_name, (h.a).id
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
  with near as (
    select a.id, a.styles
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
      and 3958.8 * 2 * asin(least(1.0, sqrt(
            power(sin(radians(s.latitude::float8 - p_lat) / 2), 2)
            + cos(radians(p_lat)) * cos(radians(s.latitude::float8))
            * power(sin(radians(s.longitude::float8 - p_lng) / 2), 2)
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

grant execute on function public.finder_artists_near(double precision, double precision, double precision, text[], integer, integer) to anon, authenticated;
grant execute on function public.finder_style_counts_near(double precision, double precision, double precision) to anon, authenticated;
