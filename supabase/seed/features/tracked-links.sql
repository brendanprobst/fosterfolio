-- Tracked-link seed rows for the development fosters.
--
--   npm run supabase:seed:tracked-links
--   npm run supabase:seed:tracked-links:down -- --yes
--
-- Ids start with f05e. Re-running upserts.
-- A link whose pet or owner is missing is skipped. The other links still apply.

insert into public.tracked_links (
  id, pet_id, owner_id, code, channel_key, channel_name, label, archived_at, created_at
)
select * from (
values
  (
    'f05e0005-0000-4000-8000-000000000001'::uuid,
    'f05e0001-0000-4000-8000-000000000001'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'MOCHI001',
    'lawn_sign',
    'Lawn sign',
    'front yard',
    null,
    now() - interval '3 days'
  ),
  (
    'f05e0005-0000-4000-8000-000000000002'::uuid,
    'f05e0001-0000-4000-8000-000000000001'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'MOCHIVET',
    'vet-office',
    'Vet Office',
    'lobby',
    null,
    now() - interval '2 days'
  ),
  (
    'f05e0005-0000-4000-8000-000000000003'::uuid,
    'f05e0001-0000-4000-8000-000000000001'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'MOCHIFLY',
    'flyer',
    'Flyer',
    'corner of 5th',
    now() - interval '1 day',
    now() - interval '4 days'
  )
) as v(id, pet_id, owner_id, code, channel_key, channel_name, label, archived_at, created_at)
where exists (select 1 from public.pets p where p.id = v.pet_id)
  and exists (select 1 from public.users u where u.id = v.owner_id)
on conflict (id) do update
  set pet_id = excluded.pet_id,
      owner_id = excluded.owner_id,
      code = excluded.code,
      channel_key = excluded.channel_key,
      channel_name = excluded.channel_name,
      label = excluded.label,
      archived_at = excluded.archived_at,
      created_at = excluded.created_at;

select entity, rows
from (
  select 1 as sort, 'tracked_links' as entity, count(*)::int as rows
    from public.tracked_links
   where id::text like 'f05e%'
) as summary
order by sort;
