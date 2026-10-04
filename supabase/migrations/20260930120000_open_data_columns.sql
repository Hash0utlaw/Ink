-- Open-data enrichment columns for shops (Overture Maps / Foursquare OS Places).
-- Used by scripts/match-open-data.ts. Additive only; safe to re-run.

alter table public.shops add column if not exists overture_id text;
alter table public.shops add column if not exists instagram_url text;
alter table public.shops add column if not exists facebook_url text;
alter table public.shops add column if not exists possibly_closed boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'shops_overture_id_key' and conrelid = 'public.shops'::regclass
  ) then
    alter table public.shops add constraint shops_overture_id_key unique (overture_id);
  end if;
end $$;
