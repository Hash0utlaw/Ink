-- Per-style counts of active artists, for the homepage "Browse by style" list.
-- Read-only; runs with the caller's rights (RLS on artists applies). Safe to re-run.

create or replace function public.style_counts()
returns table (style text, artists bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select s.style, count(*)::bigint as artists
  from public.artists a
  cross join lateral unnest(a.styles) as s(style)
  where a.is_active
  group by s.style
  order by artists desc, s.style
$$;

grant execute on function public.style_counts() to anon, authenticated;
