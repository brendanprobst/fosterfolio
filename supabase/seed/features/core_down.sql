-- Remove everything features/core.sql created, and nothing else.
--
--   npm run supabase:seed:down -- --yes
--
-- Or paste this whole file into the Supabase SQL editor.
--
-- Two independent predicates, both narrow:
--   * ids beginning with `f05e`         — seeded rows
--   * emails ending `@seed.fosterfolio.test` — seeded accounts and senders
--
-- Deleting from auth.users cascades through public.users to pets, posts,
-- profile_stars, and inquiries. The explicit deletes below still run so the
-- file also works when auth.users is not writable by the current role, and so
-- a partial seed cannot leave orphans behind.

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- 1. Seed accounts (cascades to all owned rows)
-- ---------------------------------------------------------------------------

do $$
declare
  v_deleted int;
begin
  delete from auth.users where email like '%@seed.fosterfolio.test';
  get diagnostics v_deleted = row_count;
  raise notice 'Deleted % auth.users row(s).', v_deleted;
exception
  when insufficient_privilege then
    raise notice 'Could not delete auth.users (insufficient privilege). Profile rows are still removed below; the auth accounts remain and re-seeding will reuse them.';
end
$$;

-- ---------------------------------------------------------------------------
-- 2. Leftovers by id prefix (no-ops after a successful cascade)
-- ---------------------------------------------------------------------------

delete from public.inquiries where id::text like 'f05e%';
delete from public.profile_stars where id::text like 'f05e%';
delete from public.posts where id::text like 'f05e%';
delete from public.pets where id::text like 'f05e%';
delete from public.users where id::text like 'f05e%';

-- Inquiries are public inserts, so a seeded sender can exist against a
-- non-seeded target.
delete from public.inquiries where sender_email like '%@seed.fosterfolio.test';

-- ---------------------------------------------------------------------------
-- 3. Allowlist entries added by the seed
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.allowed_emails') is null then
    return;
  end if;
  delete from public.allowed_emails where email like '%@seed.fosterfolio.test';
end
$$;

-- ---------------------------------------------------------------------------
-- Summary — every count should be 0
-- ---------------------------------------------------------------------------

select entity, remaining
from (
  select 1 as sort, 'users' as entity, count(*)::int as remaining
    from public.users where id::text like 'f05e%'
  union all
  select 2, 'pets', count(*)::int from public.pets where id::text like 'f05e%'
  union all
  select 3, 'posts', count(*)::int from public.posts where id::text like 'f05e%'
  union all
  select 4, 'profile_stars', count(*)::int from public.profile_stars where id::text like 'f05e%'
  union all
  select 5, 'inquiries', count(*)::int from public.inquiries where id::text like 'f05e%'
) as summary
order by sort;
