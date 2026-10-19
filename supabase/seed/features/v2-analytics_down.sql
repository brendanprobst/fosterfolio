-- Remove what features/v2-analytics.sql created, and nothing else.
--
--   npm run supabase:seed:down -- --yes --feature v2-analytics
--
-- Analytics rows go first: deleting a link would null their link_id instead.

delete from public.analytics_daily where pet_id::text like 'f05e%';
delete from public.analytics_owner_daily where owner_id::text like 'f05e%';
delete from public.inquiries where id::text like 'f05e0004-0000-4000-8000-0000000001%';
delete from public.tracked_links where id::text like 'f05e0005-0000-4000-8000-0000000001%';

update public.pets
   set analytics_stopped_at = null
 where id::text like 'f05e%'
   and analytics_stopped_at is not null;

select entity, remaining
from (
  select 1 as sort, 'tracked_links (this file)' as entity, count(*)::int as remaining
    from public.tracked_links
   where id::text like 'f05e0005-0000-4000-8000-0000000001%'
  union all
  select 2, 'analytics_daily', count(*)::int
    from public.analytics_daily
   where pet_id::text like 'f05e%'
  union all
  select 3, 'analytics_owner_daily', count(*)::int
    from public.analytics_owner_daily
   where owner_id::text like 'f05e%'
  union all
  select 4, 'inquiries (this file)', count(*)::int
    from public.inquiries
   where id::text like 'f05e0004-0000-4000-8000-0000000001%'
  union all
  select 5, 'pets with analytics_stopped_at', count(*)::int
    from public.pets
   where id::text like 'f05e%' and analytics_stopped_at is not null
) as summary
order by sort;
