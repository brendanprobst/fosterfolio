-- Tracked-link seed rows for the development fosters.
--
--   npm run supabase:seed:tracked-links
--   npm run supabase:seed:tracked-links:down -- --yes
--
-- Ids start with f05e. Re-running upserts.
-- 3 pet links for Mochi, plus 1 foster-me link for the same owner.
-- A pet link whose pet or owner is missing is skipped. A foster-me link
-- whose owner is missing is skipped. The other links still apply.

insert into public.tracked_links (
  id, pet_id, owner_id, code, channel_key, channel_name, label, archived_at, created_at, target
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
    null::timestamptz,
    now() - interval '3 days',
    'pet'
  ),
  (
    'f05e0005-0000-4000-8000-000000000002'::uuid,
    'f05e0001-0000-4000-8000-000000000001'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'MOCHIVET',
    'vet-office',
    'Vet Office',
    'lobby',
    null::timestamptz,
    now() - interval '2 days',
    'pet'
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
    now() - interval '4 days',
    'pet'
  ),
  (
    'f05e0005-0000-4000-8000-000000000004'::uuid,
    null::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'ALEXFM01',
    'instagram',
    'Instagram',
    'foster-me page',
    null::timestamptz,
    now() - interval '1 day',
    'foster_me'
  )
) as v(id, pet_id, owner_id, code, channel_key, channel_name, label, archived_at, created_at, target)
where exists (select 1 from public.users u where u.id = v.owner_id)
  and (
    (v.target = 'pet' and exists (select 1 from public.pets p where p.id = v.pet_id))
    or (v.target = 'foster_me' and v.pet_id is null)
  )
on conflict (id) do update
  set pet_id = excluded.pet_id,
      owner_id = excluded.owner_id,
      code = excluded.code,
      channel_key = excluded.channel_key,
      channel_name = excluded.channel_name,
      label = excluded.label,
      archived_at = excluded.archived_at,
      created_at = excluded.created_at,
      target = excluded.target;

select entity, rows
from (
  select 1 as sort, 'tracked_links' as entity, count(*)::int as rows
    from public.tracked_links
   where id::text like 'f05e%'
) as summary
order by sort;
