-- Fosterfolio v2: rollup writes each table in one statement (review item L5).
-- analytics_daily_uniq and analytics_owner_daily_uniq were expression indexes on
-- coalesce(link_id, zero uuid) and coalesce(city, ''). PostgREST's on_conflict takes column
-- names only, so the API used to write one row per request. Plain-column indexes with
-- nulls not distinct (Postgres 15+) give the same key, and the repositories now send one
-- bulk upsert per table: ?on_conflict=...&Prefer: resolution=merge-duplicates.
--
-- One difference: the old key treated a null city and '' as equal, and the new one does not.
-- The rollup stores an empty city as null and never writes '', so '' cities become null first.
-- Under the old key a '' row and a null row with the same other columns could not both
-- exist, so this update cannot collide.
--
-- analytics_link_view_totals sums views per link in SQL. The API used to read every row and
-- add them up, and PostgREST's max_rows (1000) cut that read off without an error.

update public.analytics_daily set city = null where city = '';
update public.analytics_owner_daily set city = null where city = '';

drop index if exists public.analytics_daily_uniq;
create unique index analytics_daily_uniq
  on public.analytics_daily (pet_id, link_id, channel_key, city, day)
  nulls not distinct;

drop index if exists public.analytics_owner_daily_uniq;
create unique index analytics_owner_daily_uniq
  on public.analytics_owner_daily (owner_id, link_id, channel_key, city, day)
  nulls not distinct;

create index if not exists analytics_daily_link_id_idx
  on public.analytics_daily (link_id)
  where link_id is not null;

create or replace function public.analytics_link_view_totals(p_link_ids uuid[])
returns table (link_id uuid, views bigint)
language sql
stable
set search_path = ''
as $$
  select d.link_id, sum(d.views)::bigint
    from public.analytics_daily d
   where d.link_id = any (p_link_ids)
   group by d.link_id;
$$;

revoke all on function public.analytics_link_view_totals(uuid[]) from public, anon, authenticated;
grant execute on function public.analytics_link_view_totals(uuid[]) to service_role;
