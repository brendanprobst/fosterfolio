-- Fosterfolio v2: an adopted pet's analytics are final (review item L4).
-- The rollup re-aggregates the last 14 days every hour. It now skips pet rows dated after
-- the UTC day of pets.analytics_stopped_at, so the "Final results" stop changing.
--
-- analytics_stopped_at is set when a pet becomes adopted. Pets adopted under v1, before the
-- column existed, have it null and would never freeze. Backfill those with updated_at, the
-- closest record of when the status changed. A pet edited after adoption gets a later stop,
-- which only keeps a few extra days of rows.
--
-- Rows already stored for days after the stop came from views after adoption. The rollup no
-- longer rewrites them, so they would stay in the totals forever (including
-- analytics_link_view_totals). Delete them. On a database where analytics_daily is empty,
-- like prod at launch, the delete does nothing.

update public.pets
   set analytics_stopped_at = updated_at
 where status = 'adopted'
   and analytics_stopped_at is null;

delete from public.analytics_daily d
 using public.pets p
 where p.id = d.pet_id
   and p.analytics_stopped_at is not null
   and d.day > (p.analytics_stopped_at at time zone 'UTC')::date;
