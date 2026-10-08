-- Fosterfolio development seed data.
--
--   npm run supabase:seed          -- apply every feature seed, including this file
--   npm run supabase:seed:down     -- remove every row the feature seeds created
--
-- Or paste this whole file into the Supabase SQL editor. Run it as ONE batch:
-- Postgres wraps a multi-statement batch in a single implicit transaction, so a
-- failure part-way through rolls everything back.
--
-- NOT a migration. It lives in supabase/seed/features/ on purpose so
-- `supabase db push` can never apply it to a production project.
--
-- ---------------------------------------------------------------------------
-- What you get
-- ---------------------------------------------------------------------------
-- 6 fosters, 12 pets, 27 posts, 8 profile stars, 4 inquiries — shaped to cover
-- the cases that are tedious to click together by hand:
--
--   * 26 visible posts, so `GET /posts` (default limit 20) returns a real
--     `nextCursor` and a second page.
--   * Two posts share an identical `created_at`, which exercises the keyset
--     tie-break on `id` in `PostRepository.listFeed`.
--   * Soft-deleted rows (one pet, one post, one user) that every read path
--     must hide.
--   * A user with a null `display_name` and a pet with only the required
--     columns, for avatar/empty-state fallbacks.
--   * Every `PET_SPECIES` and `PET_STATUSES` value, plus `sub_status`,
--     unicode/emoji names, markdown bios, `important_links`, `social_links`.
--   * Non-zero star counts and inquiries with and without `target_pet_id`.
--
-- ---------------------------------------------------------------------------
-- Sign-in
-- ---------------------------------------------------------------------------
-- Seed rows go into `auth.users` because `public.users.id` references it. That
-- means you can sign in as any seeded foster:
--
--   email:    alex.foster@seed.fosterfolio.test   (and the five others below)
--   password: Fosterfolio-Seed-2026!
--
-- Override the password for one run:
--
--   select set_config('fosterfolio.seed_password', 'my-password', false);
--   -- then run the rest of this file in the same session
--   -- (the npm script does this for you via --password / SEED_PASSWORD)
--
-- Writing to `auth.users` needs the `postgres` role: the Management API, the
-- dashboard SQL editor, or psql against the session pooler. It fails with a
-- clear message under a weaker role.
--
-- ---------------------------------------------------------------------------
-- Conventions
-- ---------------------------------------------------------------------------
-- * Every id starts with `f05e` ("foster seed"), so seeded rows are greppable
--   in the dashboard and countable in the summary at the bottom of this file.
-- * Every email ends in `@seed.fosterfolio.test`, the single predicate
--   `core_down.sql` uses for teardown.
-- * Re-running is safe: every insert upserts, and `created_at` values are
--   relative to `now()`, so the feed always looks freshly posted.

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Preflight
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.users') is null or to_regclass('public.posts') is null then
    raise exception 'Fosterfolio core schema is missing (public.users / public.posts). Apply migrations first: npm run supabase:push';
  end if;
end
$$;

-- pgcrypto provides crypt()/gen_salt() for the auth.users password hash. It is
-- pre-installed on Supabase (schema `extensions`); this is a no-op there.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Allowlist — insert first so the signup gate never blocks the seed
-- ---------------------------------------------------------------------------
-- `enforce_allowed_email` is a BEFORE INSERT trigger on auth.users. When the
-- private-beta flag is on it rejects emails that are not approved, so the seed
-- emails have to be on the list before step 2 runs. Harmless when the flag is
-- off; `dev_seed_down.sql` removes these rows again.

do $$
begin
  if to_regclass('public.allowed_emails') is null then
    raise notice 'Skipping allowed_emails (allowlist migration not applied).';
    return;
  end if;

  insert into public.allowed_emails (email, note)
  select email, 'fosterfolio dev seed'
  from (
    values
      ('alex.foster@seed.fosterfolio.test'),
      ('bianca.nguyen@seed.fosterfolio.test'),
      ('carlos.rivera@seed.fosterfolio.test'),
      ('dana.whitfield@seed.fosterfolio.test'),
      ('evan.brooks@seed.fosterfolio.test'),
      ('mia.minimal@seed.fosterfolio.test')
  ) as t(email)
  on conflict (email) do nothing;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. auth.users + auth.identities (so seed fosters can sign in)
-- ---------------------------------------------------------------------------

do $$
declare
  v_password text := coalesce(
    nullif(current_setting('fosterfolio.seed_password', true), ''),
    'Fosterfolio-Seed-2026!'
  );
  v_crypto_schema text;
  v_hash text;
  r record;
begin
  -- pgcrypto lives in `extensions` on Supabase but in `public` on a plain
  -- Postgres, and DO blocks do not inherit a guaranteed search_path. Resolve
  -- the real schema instead of guessing.
  select n.nspname
    into v_crypto_schema
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where p.proname = 'crypt'
   order by case n.nspname when 'extensions' then 0 when 'public' then 1 else 2 end
   limit 1;

  if v_crypto_schema is null then
    raise exception 'pgcrypto is not available (no crypt() function). Enable it: create extension pgcrypto;';
  end if;

  execute format(
    'select %I.crypt($1, %I.gen_salt(''bf''))',
    v_crypto_schema, v_crypto_schema
  ) into v_hash using v_password;

  for r in
    select *
    from (
      values
        ('f05e0000-0000-4000-8000-000000000001'::uuid, 'alex.foster@seed.fosterfolio.test',     'Alex Foster'),
        ('f05e0000-0000-4000-8000-000000000002'::uuid, 'bianca.nguyen@seed.fosterfolio.test',  'Bianca Nguyen'),
        ('f05e0000-0000-4000-8000-000000000003'::uuid, 'carlos.rivera@seed.fosterfolio.test',  'Carlos Rivera'),
        ('f05e0000-0000-4000-8000-000000000004'::uuid, 'dana.whitfield@seed.fosterfolio.test', 'Dana Whitfield'),
        ('f05e0000-0000-4000-8000-000000000005'::uuid, 'evan.brooks@seed.fosterfolio.test',    'Evan Brooks'),
        ('f05e0000-0000-4000-8000-000000000006'::uuid, 'mia.minimal@seed.fosterfolio.test',    null)
    ) as t(id, email, display_name)
  loop
    begin
    -- The empty-string token columns are deliberate: GoTrue scans them into
    -- non-nullable Go strings, and NULLs there break sign-in.
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      r.id,
      'authenticated',
      'authenticated',
      r.email,
      v_hash,
      now(),
      now(),
      now(),
      null,
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_strip_nulls(
        jsonb_build_object(
          'email', r.email,
          'email_verified', true,
          'display_name', r.display_name
        )
      ),
      '', '', '', ''
    )
    on conflict (id) do update
      set email              = excluded.email,
          encrypted_password = excluded.encrypted_password,
          email_confirmed_at = excluded.email_confirmed_at,
          raw_user_meta_data = excluded.raw_user_meta_data,
          updated_at         = now();

    insert into auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      created_at,
      updated_at
    )
    values (
      r.id::text,
      r.id,
      jsonb_build_object(
        'sub', r.id::text,
        'email', r.email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now()
    )
    on conflict (provider_id, provider) do update
      set identity_data = excluded.identity_data,
          updated_at    = now();
    exception
      when insufficient_privilege then
        raise;
      when foreign_key_violation or unique_violation or check_violation then
        null;
    end;
  end loop;
exception
  when insufficient_privilege then
    raise exception
      using errcode = '42501',
        message = 'Cannot write auth.users, so no seed profiles can be created.',
        detail  = 'public.users.id references auth.users(id), so the seed needs the postgres role.',
        hint    = 'Run this file with npm run supabase:seed (Management API), the dashboard SQL editor, or psql against the session pooler URL in supabase/.env.local.';
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Profiles (public.users)
-- ---------------------------------------------------------------------------
-- `handle_new_user` already inserted (id, email) from step 2; this fills in the
-- profile. `search_vector` is generated — never insert it.

-- A row whose auth user is missing is skipped. The other profiles still apply.
insert into public.users (
  id, email, display_name, avatar_url, bio,
  zip_code, city, state, lat, lng,
  social_links, shelters_text, created_at, deleted_at
)
select * from (
values
  (
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'alex.foster@seed.fosterfolio.test',
    'Alex Foster',
    'https://picsum.photos/seed/fosterfolio-alex/256/256',
    'Long-term foster in the Mission. Mostly seniors and bottle babies. Ask me about crate training.',
    '94107', 'San Francisco', 'CA', 37.7642, -122.3949,
    '[{"label":"Instagram","url":"https://instagram.com/alexfosters"},{"label":"Foster diary","url":"https://alexfosters.example.com"}]'::jsonb,
    '[{"name":"SF Animal Care & Control","url":"https://www.sf.gov/departments/animal-care-control"},{"name":"Muttville","url":"https://www.muttville.org"}]',
    now() - interval '240 days',
    null
  ),
  (
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'bianca.nguyen@seed.fosterfolio.test',
    'Bianca Nguyen',
    'https://picsum.photos/seed/fosterfolio-bianca/256/256',
    'Cat foster and TNR volunteer. Two permanent residents, one revolving guest room.',
    '94607', 'Oakland', 'CA', 37.7983, -122.2745,
    '[{"label":"Bluesky","url":"https://bsky.app/profile/bianca.example.com"}]'::jsonb,
    '[{"name":"Oakland Animal Services","url":""}]',
    now() - interval '180 days',
    null
  ),
  (
    'f05e0000-0000-4000-8000-000000000003'::uuid,
    'carlos.rivera@seed.fosterfolio.test',
    'Carlos Rivera',
    'https://picsum.photos/seed/fosterfolio-carlos/256/256',
    'Austin foster, mostly heartworm treatment cases. Slow walks only.',
    '78704', 'Austin', 'TX', 30.2489, -97.7713,
    '[]'::jsonb,
    '[{"name":"Austin Pets Alive!","url":"https://www.austinpetsalive.org"}]',
    now() - interval '120 days',
    null
  ),
  -- No pets and no posts: exercises the empty public profile.
  (
    'f05e0000-0000-4000-8000-000000000004'::uuid,
    'dana.whitfield@seed.fosterfolio.test',
    'Dana Whitfield',
    null,
    'Just signed up. Waiting on my first placement.',
    '11201', 'Brooklyn', 'NY', 40.6939, -73.9903,
    null,
    null,
    now() - interval '3 days',
    null
  ),
  -- Soft-deleted account: must never appear in reads or search.
  (
    'f05e0000-0000-4000-8000-000000000005'::uuid,
    'evan.brooks@seed.fosterfolio.test',
    'Evan Brooks',
    null,
    'Deactivated seed account.',
    '97214', 'Portland', 'OR', 45.5125, -122.6543,
    null,
    null,
    now() - interval '90 days',
    now() - interval '10 days'
  ),
  -- Everything optional left null, including display_name.
  (
    'f05e0000-0000-4000-8000-000000000006'::uuid,
    'mia.minimal@seed.fosterfolio.test',
    null, null, null, null, null, null, null, null, null, null,
    now() - interval '1 day',
    null
  )
) as v(
  id, email, display_name, avatar_url, bio,
  zip_code, city, state, lat, lng,
  social_links, shelters_text, created_at, deleted_at
)
where exists (select 1 from auth.users a where a.id = v.id)
on conflict (id) do update
  set email         = excluded.email,
      display_name  = excluded.display_name,
      avatar_url    = excluded.avatar_url,
      bio           = excluded.bio,
      zip_code      = excluded.zip_code,
      city          = excluded.city,
      state         = excluded.state,
      lat           = excluded.lat,
      lng           = excluded.lng,
      social_links  = excluded.social_links,
      shelters_text = excluded.shelters_text,
      created_at    = excluded.created_at,
      deleted_at    = excluded.deleted_at;

-- ---------------------------------------------------------------------------
-- 4. Pets
-- ---------------------------------------------------------------------------
-- Covers all PET_SPECIES and PET_STATUSES values, both age units, every size,
-- one soft delete, one minimal record, and one unicode name for search.

-- A pet whose owner row is missing is skipped. The other pets still apply.
insert into public.pets (
  id, owner_id, name, species, breed,
  age_value, age_unit, sex, size, status, sub_status,
  shelter_link_name, shelter_link_url, primary_photo_url, bio_markdown,
  important_links, created_at, updated_at, deleted_at
)
select * from (
values
  (
    'f05e0001-0000-4000-8000-000000000001'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'Mochi', 'dog', 'Shiba mix',
    2, 'years', 'male', 'medium', 'actively_fostering', null,
    'SF Animal Care & Control', 'https://www.sfanimalcare.org/adopt/',
    'https://picsum.photos/seed/fosterfolio-mochi/800/800',
    $md$## About Mochi

Mochi came to us in April as a stray with a limp that turned out to be nothing
more than a thorn. He is **crate trained**, house trained, and completely
unbothered by the vacuum.

### Good with

- Adults and calm kids
- Other medium dogs after a slow intro
- Car rides (he sleeps the whole way)

### Still working on

- Cats — high prey drive, needs a cat-free home
- Recall off leash

He knows *sit*, *down*, *touch*, and a very sloppy *shake*.$md$,
    '[{"label":"Adoption application","url":"https://example.com/apply/mochi"},{"label":"Vet records (PDF)","url":"https://example.com/records/mochi.pdf"}]'::jsonb,
    now() - interval '150 days', now() - interval '2 hours', null
  ),
  (
    'f05e0001-0000-4000-8000-000000000002'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'Sesame', 'cat', 'Domestic shorthair',
    8, 'months', 'female', 'small', 'available', 'application_pending',
    'Muttville', 'https://muttville.org',
    'https://picsum.photos/seed/fosterfolio-sesame/800/800',
    'Tortie with opinions. Sleeps on your head. Two applications in review.',
    '[{"label":"Adoption application","url":"https://example.com/apply/sesame"}]'::jsonb,
    now() - interval '60 days', now() - interval '10 hours', null
  ),
  (
    'f05e0001-0000-4000-8000-000000000003'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'Waffles', 'rabbit', 'Holland Lop',
    3, 'years', 'unknown', 'small', 'medical_hold', 'dental_recheck',
    null, null,
    'https://picsum.photos/seed/fosterfolio-waffles/800/800',
    'Recovering from dental surgery. Eating hay again, which is the whole ballgame with rabbits.',
    null,
    now() - interval '45 days', now() - interval '24 hours', null
  ),
  (
    'f05e0001-0000-4000-8000-000000000004'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'Kiwi', 'bird', 'Budgie',
    10, 'weeks', 'female', 'small', 'available', null,
    null, null,
    'https://picsum.photos/seed/fosterfolio-kiwi/800/800',
    'Hand-fed, learning to step up. Would love to go home with a second budgie.',
    null,
    now() - interval '30 days', now() - interval '36 hours', null
  ),
  (
    'f05e0001-0000-4000-8000-000000000005'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'Biscuit', 'dog', 'Beagle mix',
    5, 'years', 'male', 'large', 'adopted', null,
    'SF Animal Care & Control', 'https://www.sfanimalcare.org/adopt/',
    'https://picsum.photos/seed/fosterfolio-biscuit/800/800',
    'Adopted in September by the family two doors down. Still gets his walks with us.',
    null,
    now() - interval '200 days', now() - interval '1 hour', null
  ),
  (
    'f05e0001-0000-4000-8000-000000000006'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'Señor Whiskers', 'cat', 'Maine Coon mix',
    4, 'years', 'male', 'large', 'actively_fostering', null,
    'Oakland Animal Services', 'https://www.oaklandanimalservices.org',
    'https://picsum.photos/seed/fosterfolio-whiskers/800/800',
    'Fifteen pounds of floof. The accent in his name is intentional — good for testing URL encoding.',
    null,
    now() - interval '100 days', now() - interval '6 hours', null
  ),
  (
    'f05e0001-0000-4000-8000-000000000007'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'Pepper', 'dog', 'Pit mix',
    18, 'months', 'female', 'large', 'available', null,
    null, null,
    'https://picsum.photos/seed/fosterfolio-pepper/800/800',
    'Velcro dog. Knows *place* and holds it for a full minute, which she is very proud of.',
    '[{"label":"Adoption application","url":"https://example.com/apply/pepper"}]'::jsonb,
    now() - interval '75 days', now() - interval '16 hours', null
  ),
  (
    'f05e0001-0000-4000-8000-000000000008'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'Marbles', 'other', 'Guinea pig',
    1, 'years', 'female', 'small', 'available', 'bonded_pair',
    null, null,
    'https://picsum.photos/seed/fosterfolio-marbles/800/800',
    'Bonded with her sister; they go home together or not at all.',
    null,
    now() - interval '20 days', now() - interval '54 hours', null
  ),
  (
    'f05e0001-0000-4000-8000-000000000009'::uuid,
    'f05e0000-0000-4000-8000-000000000003'::uuid,
    'Juniper', 'dog', 'Australian Shepherd mix',
    6, 'months', 'female', 'medium', 'actively_fostering', null,
    'Austin Pets Alive!', 'https://www.austinpetsalive.org',
    'https://picsum.photos/seed/fosterfolio-juniper/800/800',
    'Puppy energy in a smart package. Needs a job or she will invent one.',
    null,
    now() - interval '40 days', now() - interval '12 hours', null
  ),
  (
    'f05e0001-0000-4000-8000-000000000010'::uuid,
    'f05e0000-0000-4000-8000-000000000003'::uuid,
    'Tumbleweed', 'cat', 'Domestic longhair',
    12, 'years', 'male', 'medium', 'available', 'senior_special',
    null, null,
    'https://picsum.photos/seed/fosterfolio-tumbleweed/800/800',
    'Senior gentleman. Adoption fee waived. Wants a sunbeam and a lap, in that order.',
    null,
    now() - interval '25 days', now() - interval '40 hours', null
  ),
  -- Soft-deleted pet: hidden from every read path.
  (
    'f05e0001-0000-4000-8000-000000000011'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'Ghost', 'dog', 'Husky mix',
    4, 'years', 'male', 'large', 'adopted', null,
    null, null, null,
    'Removed by the owner. Should never render.',
    null,
    now() - interval '300 days', now() - interval '30 days', now() - interval '30 days'
  ),
  -- Only the required columns; everything optional stays null.
  (
    'f05e0001-0000-4000-8000-000000000012'::uuid,
    'f05e0000-0000-4000-8000-000000000003'::uuid,
    'Kitten litter #4', 'cat', null,
    null, null, null, null, 'actively_fostering', null,
    null, null, null, null,
    null,
    now() - interval '5 days', now() - interval '5 days', null
  )
) as v(
  id, owner_id, name, species, breed,
  age_value, age_unit, sex, size, status, sub_status,
  shelter_link_name, shelter_link_url, primary_photo_url, bio_markdown,
  important_links, created_at, updated_at, deleted_at
)
where exists (select 1 from public.users u where u.id = v.owner_id)
on conflict (id) do update
  set owner_id          = excluded.owner_id,
      name              = excluded.name,
      species           = excluded.species,
      breed             = excluded.breed,
      age_value         = excluded.age_value,
      age_unit          = excluded.age_unit,
      sex               = excluded.sex,
      size              = excluded.size,
      status            = excluded.status,
      sub_status        = excluded.sub_status,
      shelter_link_name = excluded.shelter_link_name,
      shelter_link_url  = excluded.shelter_link_url,
      primary_photo_url = excluded.primary_photo_url,
      bio_markdown      = excluded.bio_markdown,
      important_links   = excluded.important_links,
      created_at        = excluded.created_at,
      deleted_at        = excluded.deleted_at;

-- ---------------------------------------------------------------------------
-- 5. Posts (feed)
-- ---------------------------------------------------------------------------
-- Newest first, matching feed order. 26 visible + 1 soft-deleted.
--   * `pet_update` rows must carry a pet_id (posts_pet_update_requires_pet).
--   * Rows 14 and 15 share a created_at on purpose: the feed cursor has to
--     fall back to `id` to avoid skipping or repeating one of them.
--   * `updated_at` is owned by the posts_touch_updated_at trigger.

-- A post whose author or pet is missing is skipped. The other posts still apply.
insert into public.posts (
  id, author_id, post_type, pet_id, body_text, image_url, geo_lock, created_at, deleted_at
)
select * from (
values
  (
    'f05e0002-0000-4000-8000-000000000001'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'general', null,
    'Adoption day for Biscuit 🎉 Five months of fostering and he moved two doors down. Best possible ending.',
    'https://picsum.photos/seed/fosterfolio-post-01/1200/900',
    'local', now() - interval '1 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000002'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'pet_update', 'f05e0001-0000-4000-8000-000000000001'::uuid,
    'Mochi finally figured out the stairs. Took a week of treats on every step.',
    'https://picsum.photos/seed/fosterfolio-post-02/1200/900',
    'local', now() - interval '2 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000003'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'general', null,
    'Does anyone in the East Bay have a spare medium-size crate for a week? Happy to pick up.',
    null,
    'local', now() - interval '4 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000004'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'pet_update', 'f05e0001-0000-4000-8000-000000000006'::uuid,
    'Señor Whiskers has claimed the laundry basket. It is his now.',
    'https://picsum.photos/seed/fosterfolio-post-04/1200/900',
    'local', now() - interval '6 hours', null
  ),
  -- Only global post in the seed: verifies geo_lock is not always 'local'.
  (
    'f05e0002-0000-4000-8000-000000000005'::uuid,
    'f05e0000-0000-4000-8000-000000000003'::uuid,
    'general', null,
    'Heartworm treatment thread — happy to answer questions from anyone starting the slow-kill protocol.',
    null,
    'global', now() - interval '8 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000006'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'pet_update', 'f05e0001-0000-4000-8000-000000000002'::uuid,
    'Two applications in for Sesame. Meet-and-greets this weekend.',
    null,
    'local', now() - interval '10 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000007'::uuid,
    'f05e0000-0000-4000-8000-000000000003'::uuid,
    'pet_update', 'f05e0001-0000-4000-8000-000000000009'::uuid,
    'Juniper learned to ring the bell to go outside. She now rings it recreationally.',
    'https://picsum.photos/seed/fosterfolio-post-07/1200/900',
    'local', now() - interval '12 hours', null
  ),
  -- Long body: line wrapping, clamping, and overflow in the feed card.
  (
    'f05e0002-0000-4000-8000-000000000008'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'general', null,
    $body$Two years of fostering, everything I would tell a new foster:

Set up one closable room before the animal arrives. Not the whole house — one room, with the crate, water, and nothing they can destroy. Decompression is real and three days of boredom beats three weeks of undoing a bad first impression.

Write down everything the vet says, immediately, in the parking lot. You will not remember the dosage.

Photograph them every week in the same spot. You will not notice the weight coming back on until you compare pictures a month apart.

And take the adoption day photo. You will want it later, even though it is the hard part.$body$,
    null,
    'local', now() - interval '14 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000009'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'pet_update', 'f05e0001-0000-4000-8000-000000000007'::uuid,
    'Pepper held a place command for a full minute today. Unclear who is prouder.',
    null,
    'local', now() - interval '16 hours', null
  ),
  -- Image with no body text: the card must not render an empty text block.
  (
    'f05e0002-0000-4000-8000-000000000010'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'general', null,
    null,
    'https://picsum.photos/seed/fosterfolio-post-10/1200/900',
    'local', now() - interval '18 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000011'::uuid,
    'f05e0000-0000-4000-8000-000000000003'::uuid,
    'general', null,
    'Austin folks: the low-cost vaccine clinic on South First has openings Saturday morning.',
    null,
    'local', now() - interval '20 hours', null
  ),
  -- Soft-deleted post: same author and hour as the row above, must stay hidden.
  (
    'f05e0002-0000-4000-8000-000000000012'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'general', null,
    'Deleted seed post. Should never appear in the feed or on a profile.',
    null,
    'local', now() - interval '20 hours', now() - interval '19 hours'
  ),
  (
    'f05e0002-0000-4000-8000-000000000013'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'pet_update', 'f05e0001-0000-4000-8000-000000000003'::uuid,
    'Waffles is eating hay again after his dental. With rabbits that is the whole ballgame.',
    'https://picsum.photos/seed/fosterfolio-post-13/1200/900',
    'local', now() - interval '24 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000014'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'general', null,
    'Kitten season is here 🐈‍⬛🍼 — six bottle babies at OAS looking for overnight fosters. Señor Whiskers is unimpressed.',
    null,
    'local', now() - interval '26 hours', null
  ),
  -- Identical created_at with the next row (keyset tie-break on id).
  (
    'f05e0002-0000-4000-8000-000000000015'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'general', null,
    'Same-timestamp post A. Paging through the feed must return both A and B exactly once.',
    null,
    'local', now() - interval '30 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000016'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'general', null,
    'Same-timestamp post B. Paging through the feed must return both A and B exactly once.',
    null,
    'local', now() - interval '30 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000017'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'pet_update', 'f05e0001-0000-4000-8000-000000000004'::uuid,
    'Kiwi is stepping up onto a finger now. Slow progress, but progress.',
    null,
    'local', now() - interval '36 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000018'::uuid,
    'f05e0000-0000-4000-8000-000000000003'::uuid,
    'pet_update', 'f05e0001-0000-4000-8000-000000000010'::uuid,
    'Tumbleweed found the one sunbeam in the house and has not moved in four hours.',
    'https://picsum.photos/seed/fosterfolio-post-18/1200/900',
    'local', now() - interval '40 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000019'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'general', null,
    'Reminder that the QR code on a pet bio page works great taped to a crate at an adoption event.',
    null,
    'local', now() - interval '48 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000020'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'pet_update', 'f05e0001-0000-4000-8000-000000000008'::uuid,
    'Marbles and her sister are a bonded pair — they go home together or not at all.',
    null,
    'local', now() - interval '54 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000021'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'pet_update', 'f05e0001-0000-4000-8000-000000000001'::uuid,
    'Mochi met the neighbor dog through the fence. No barking. Small miracle.',
    null,
    'local', now() - interval '60 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000022'::uuid,
    'f05e0000-0000-4000-8000-000000000003'::uuid,
    'general', null,
    'Three heartworm-positive dogs at APA! need quiet homes for eight weeks. Crate rest, short walks.',
    null,
    'local', now() - interval '72 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000023'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'general', null,
    'Foster tip: keep a folder of vet receipts per animal. Reimbursement is much easier at the end.',
    null,
    'local', now() - interval '84 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000024'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'general', null,
    'TNR morning: four cats trapped, all ear-tipped and released by noon. Coffee was involved.',
    'https://picsum.photos/seed/fosterfolio-post-24/1200/900',
    'local', now() - interval '96 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000025'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'pet_update', 'f05e0001-0000-4000-8000-000000000005'::uuid,
    'Biscuit passed his meet-and-greet with the family down the street. Fingers crossed.',
    null,
    'local', now() - interval '120 hours', null
  ),
  (
    'f05e0002-0000-4000-8000-000000000026'::uuid,
    'f05e0000-0000-4000-8000-000000000003'::uuid,
    'general', null,
    'Juniper is my first puppy foster and I now understand why everyone warned me about puppies.',
    null,
    'local', now() - interval '144 hours', null
  ),
  -- Oldest visible post: the last row on the second feed page.
  (
    'f05e0002-0000-4000-8000-000000000027'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'general', null,
    'First post. Two dogs, one cat, and a spare room. Here goes.',
    null,
    'local', now() - interval '168 hours', null
  )
) as v(id, author_id, post_type, pet_id, body_text, image_url, geo_lock, created_at, deleted_at)
where exists (select 1 from public.users u where u.id = v.author_id)
  and (v.pet_id is null or exists (select 1 from public.pets p where p.id = v.pet_id))
on conflict (id) do update
  set author_id  = excluded.author_id,
      post_type  = excluded.post_type,
      pet_id     = excluded.pet_id,
      body_text  = excluded.body_text,
      image_url  = excluded.image_url,
      geo_lock   = excluded.geo_lock,
      created_at = excluded.created_at,
      deleted_at = excluded.deleted_at;

-- ---------------------------------------------------------------------------
-- 6. Profile stars
-- ---------------------------------------------------------------------------
-- Anonymous stars carry a null starrer_user_id. `(starred_user_id,
-- session_token)` is unique, which is what makes re-starring a no-op.

-- A star whose user is missing is skipped. The other stars still apply.
insert into public.profile_stars (id, starred_user_id, starrer_user_id, session_token, created_at)
select * from (
values
  (
    'f05e0003-0000-4000-8000-000000000001'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'seed-session-bianca', now() - interval '30 days'
  ),
  (
    'f05e0003-0000-4000-8000-000000000002'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'f05e0000-0000-4000-8000-000000000003'::uuid,
    'seed-session-carlos', now() - interval '20 days'
  ),
  (
    'f05e0003-0000-4000-8000-000000000003'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    null, 'seed-session-anon-01', now() - interval '12 days'
  ),
  (
    'f05e0003-0000-4000-8000-000000000004'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    null, 'seed-session-anon-02', now() - interval '9 days'
  ),
  (
    'f05e0003-0000-4000-8000-000000000005'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    null, 'seed-session-anon-03', now() - interval '5 days'
  ),
  (
    'f05e0003-0000-4000-8000-000000000006'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'seed-session-alex', now() - interval '15 days'
  ),
  (
    'f05e0003-0000-4000-8000-000000000007'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    null, 'seed-session-anon-04', now() - interval '4 days'
  ),
  (
    'f05e0003-0000-4000-8000-000000000008'::uuid,
    'f05e0000-0000-4000-8000-000000000003'::uuid,
    null, 'seed-session-anon-05', now() - interval '2 days'
  )
) as v(id, starred_user_id, starrer_user_id, session_token, created_at)
where exists (select 1 from public.users u where u.id = v.starred_user_id)
  and (
    v.starrer_user_id is null
    or exists (select 1 from public.users u where u.id = v.starrer_user_id)
  )
on conflict (id) do update
  set starred_user_id = excluded.starred_user_id,
      starrer_user_id = excluded.starrer_user_id,
      session_token   = excluded.session_token,
      created_at      = excluded.created_at;

-- ---------------------------------------------------------------------------
-- 7. Inquiries
-- ---------------------------------------------------------------------------
-- Public insert, owner read. Seeded so the owner-side list is not empty.

-- An inquiry whose foster or pet is missing is skipped. The other inquiries still apply.
insert into public.inquiries (
  id, target_user_id, target_pet_id, sender_name, sender_email, message, created_at
)
select * from (
values
  (
    'f05e0004-0000-4000-8000-000000000001'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'f05e0001-0000-4000-8000-000000000001'::uuid,
    'Priya Raman', 'priya.raman@seed.fosterfolio.test',
    'Hi! We met Mochi at the Saturday event. We have a fenced yard and no cats — could we set up a meet?',
    now() - interval '2 days'
  ),
  (
    'f05e0004-0000-4000-8000-000000000002'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'f05e0001-0000-4000-8000-000000000002'::uuid,
    'Tom Alvarez', 'tom.alvarez@seed.fosterfolio.test',
    'Is Sesame still available? We already have one 2-year-old cat at home.',
    now() - interval '1 days'
  ),
  -- No target_pet_id: a general inquiry to the foster.
  (
    'f05e0004-0000-4000-8000-000000000003'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    null,
    'Jo Kim', 'jo.kim@seed.fosterfolio.test',
    'Not about a specific pet — I am trying to start fostering in SF and would love to ask a few questions.',
    now() - interval '8 hours'
  ),
  (
    'f05e0004-0000-4000-8000-000000000004'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'f05e0001-0000-4000-8000-000000000007'::uuid,
    'Marcus Bell', 'marcus.bell@seed.fosterfolio.test',
    'Pepper looks perfect for us. We have had two pit mixes before. What is the next step?',
    now() - interval '30 hours'
  )
) as v(id, target_user_id, target_pet_id, sender_name, sender_email, message, created_at)
where exists (select 1 from public.users u where u.id = v.target_user_id)
  and (
    v.target_pet_id is null
    or exists (select 1 from public.pets p where p.id = v.target_pet_id)
  )
on conflict (id) do update
  set target_user_id = excluded.target_user_id,
      target_pet_id  = excluded.target_pet_id,
      sender_name    = excluded.sender_name,
      sender_email   = excluded.sender_email,
      message        = excluded.message,
      created_at     = excluded.created_at;

-- ---------------------------------------------------------------------------
-- Summary — the npm script prints these rows
-- ---------------------------------------------------------------------------

select entity, rows
from (
  select 1 as sort, 'users (visible)' as entity,
         count(*)::int as rows
    from public.users
   where id::text like 'f05e%' and deleted_at is null
  union all
  select 2, 'users (soft-deleted)', count(*)::int
    from public.users
   where id::text like 'f05e%' and deleted_at is not null
  union all
  select 3, 'pets (visible)', count(*)::int
    from public.pets
   where id::text like 'f05e%' and deleted_at is null
  union all
  select 4, 'pets (soft-deleted)', count(*)::int
    from public.pets
   where id::text like 'f05e%' and deleted_at is not null
  union all
  select 5, 'posts (visible)', count(*)::int
    from public.posts
   where id::text like 'f05e%' and deleted_at is null
  union all
  select 6, 'posts (soft-deleted)', count(*)::int
    from public.posts
   where id::text like 'f05e%' and deleted_at is not null
  union all
  select 7, 'profile_stars', count(*)::int
    from public.profile_stars
   where id::text like 'f05e%'
  union all
  select 8, 'inquiries', count(*)::int
    from public.inquiries
   where id::text like 'f05e%'
) as summary
order by sort;
