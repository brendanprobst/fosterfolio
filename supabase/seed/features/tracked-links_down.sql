-- Remove tracked-link rows created by features/tracked-links.sql.

delete from public.tracked_links where id::text like 'f05e%';

select entity, remaining
from (
  select 1 as sort, 'tracked_links' as entity, count(*)::int as remaining
    from public.tracked_links
   where id::text like 'f05e%'
) as summary
order by sort;
