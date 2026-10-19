-- Analytics seed rows for the v2 links and analytics pages.
--
--   npm run supabase:seed -- --feature v2-analytics
--   npm run supabase:seed:down -- --yes --feature v2-analytics
--
-- Depends on core.sql (fosters, pets) and tracked-links.sql (Mochi's pet links
-- and Alex's Instagram foster-me link). The file name sorts after both, so the
-- master seed applies it last and removes it first.
--
-- ---------------------------------------------------------------------------
-- What you get
-- ---------------------------------------------------------------------------
-- 8 tracked links, ~1,100 analytics_daily rows, ~225 analytics_owner_daily rows,
-- 16 inquiries, and one analytics_stopped_at. Sign in as:
--
--   alex.foster@seed.fosterfolio.test   — the full picture
--   bianca.nguyen@seed.fosterfolio.test — big numbers, conversion > 100%,
--                                         a default link with no traffic
--   carlos.rivera@seed.fosterfolio.test — pet traffic but no links at all
--
-- Pet analytics (/<handle>/pet/<id>/analytics and the owner widget):
--
--   Every pet of Alex's gets click-throughs from each of his foster-me links
--   (default, Instagram, Facebook, farmers market, archived TikTok, untagged),
--   split from the owner funnel's pet taps — the "via foster-me" badge and
--   the "See your full foster-me funnel" note on each analytics page.
--
--   Mochi       120 days over 9 channels: daily trend grain, "↑ x% vs last
--               week", a deleted link (raw key `nextdoor`), an archived
--               link, 12 cities incl. a null city, a 0-view city (hidden),
--               unicode, and a 58-character name (truncation).
--   Sesame      Foster-me taps drop to 30% this week: "Quieter than last
--               week".
--   Waffles     Older direct traffic plus foster-me taps.
--   Kiwi        Foster-me taps only.
--   Biscuit     Adopted, analytics_stopped_at 20 days ago: "Final results",
--               flat last 14 days, no week-over-week copy.
--   Whiskers    A 12,480-view TikTok spike on one day.
--   Pepper      2 views, 3 form opens, 4 inquiries (3 here + 1 from core):
--               200% conversion.
--   Marbles     Form opens and an inquiry, 0 views: conversion "—" with a
--               non-empty widget.
--   Juniper     6 days of direct traffic and no links: "New this week",
--               and the analytics page shows the create-a-link prompt.
--   Tumbleweed  Traffic 45-60 days ago only: "No visits yet" widget, empty
--               7d/30d, weekly trend grain in "all".
--   Kitten #4   One view today, null city.
--
-- Owner links (/profile/links):
--
--   Alex        Default link pinned first, 5 more foster-me links (one
--               archived with history, one new with 0 views but 1 inquiry,
--               one whose pet taps exceed its views), untagged traffic, a
--               900-view spike 40 days ago, inquiries inside and outside 30d.
--               Mochi's three pet links show in the legacy group.
--   Bianca      A default link with no traffic: all-zero funnel.
--   Carlos      No links: the first-run tutorial.
--
-- ---------------------------------------------------------------------------
-- Conventions
-- ---------------------------------------------------------------------------
-- * Link ids start f05e0005-...-0000000001, inquiry ids f05e0004-...-0000000001,
--   so this file's teardown leaves core and tracked-links rows alone.
-- * The analytics tables have no id column. Seeded rows are the ones whose
--   pet_id / owner_id starts with f05e.
-- * Days are relative to current_date (UTC on Supabase, same as the API).
--   Rollup rows are keyed by day, so an upsert would leave yesterday's run
--   behind on shifted days. This file deletes the seeded analytics rows and
--   inserts them again instead. Links and inquiries still upsert.
-- * A row whose pet, owner, or link is missing is skipped.

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Preflight
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.tracked_links') is null
     or to_regclass('public.analytics_daily') is null
     or to_regclass('public.analytics_owner_daily') is null then
    raise exception 'v2 analytics schema is missing (tracked_links / analytics_daily / analytics_owner_daily). Apply migrations first: npm run supabase:push';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1. Tracked links
-- ---------------------------------------------------------------------------
-- Alex's foster-me links, plus Bianca's default link and one pet link for
-- Señor Whiskers. Alex's Instagram link (ALEXFM01) and Mochi's pet links come
-- from tracked-links.sql.

insert into public.tracked_links (
  id, pet_id, owner_id, code, channel_key, channel_name, label, archived_at, created_at, target
)
select * from (
values
  -- Default link: pinned first with the "Default" badge.
  (
    'f05e0005-0000-4000-8000-000000000101'::uuid,
    null::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'ALEXDFLT', 'default', 'Default', null::text,
    null::timestamptz, now() - interval '60 days', 'foster_me'
  ),
  (
    'f05e0005-0000-4000-8000-000000000102'::uuid,
    null::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'ALEXFB01', 'facebook', 'Facebook', 'Rescue group post',
    null::timestamptz, now() - interval '40 days', 'foster_me'
  ),
  -- Custom channel with a long label. Pet taps exceed views on this link.
  (
    'f05e0005-0000-4000-8000-000000000103'::uuid,
    null::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'ALEXMKT1', 'farmers-market', 'Farmers market',
    'Saturday stall at the Ferry Building — bring treats, ask for Alex, and say hi to Mochi',
    null::timestamptz, now() - interval '20 days', 'foster_me'
  ),
  -- Archived 10 days ago. Its traffic stays in the 30d and all-time totals.
  (
    'f05e0005-0000-4000-8000-000000000104'::uuid,
    null::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'ALEXOLD1', 'tiktok', 'TikTok', 'Spring adoption video',
    now() - interval '10 days', now() - interval '90 days', 'foster_me'
  ),
  -- Created two hours ago: no views, but one inquiry.
  (
    'f05e0005-0000-4000-8000-000000000105'::uuid,
    null::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'ALEXNEW1', 'flyer', 'Flyer', 'Coffee shop board',
    null::timestamptz, now() - interval '2 hours', 'foster_me'
  ),
  -- Bianca: a default link that has never been visited.
  (
    'f05e0005-0000-4000-8000-000000000106'::uuid,
    null::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'BIANDFLT', 'default', 'Default', null::text,
    null::timestamptz, now() - interval '5 days', 'foster_me'
  ),
  -- Bianca: a pre-5b pet link for Señor Whiskers (legacy group).
  (
    'f05e0005-0000-4000-8000-000000000107'::uuid,
    'f05e0001-0000-4000-8000-000000000006'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'WHISKTOK', 'tiktok', 'TikTok', 'Floof reveal',
    null::timestamptz, now() - interval '25 days', 'pet'
  ),
  -- Archived the same day it was made: no traffic anywhere.
  (
    'f05e0005-0000-4000-8000-000000000108'::uuid,
    null::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'ALEXOOPS', 'instagram', 'Instagram', 'typo — made a new one',
    now() - interval '7 days', now() - interval '7 days', 'foster_me'
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

-- ---------------------------------------------------------------------------
-- 2. Biscuit stopped collecting analytics when he was adopted
-- ---------------------------------------------------------------------------

update public.pets
   set analytics_stopped_at = now() - interval '20 days'
 where id = 'f05e0001-0000-4000-8000-000000000005'::uuid;

-- ---------------------------------------------------------------------------
-- 3. analytics_daily (pet analytics)
-- ---------------------------------------------------------------------------
-- Each spec row becomes one row per day from `oldest` to `newest` days ago,
-- every `step` days. City rotates through 12 values, one of them null.
--
--   views = base + ((d * 7 + salt) % 5)
--         + boost7 on the last 7 days
--         + spike_views on spike_day

delete from public.analytics_daily where pet_id::text like 'f05e%';

with spec (pet_id, link_id, channel_key, oldest, newest, step, base, boost7, spike_day, spike_views, salt) as (
  values
    -- Mochi (Alex). Foster-me click-throughs come from section 5.
    ('f05e0001-0000-4000-8000-000000000001'::uuid, null::uuid,                                     'direct',         119,  0, 1,  4, 3, null::int, 0, 1),
    ('f05e0001-0000-4000-8000-000000000001'::uuid, 'f05e0005-0000-4000-8000-000000000001'::uuid,  'lawn_sign',        3,  0, 1,  9, 2, null,      0, 2),
    ('f05e0001-0000-4000-8000-000000000001'::uuid, 'f05e0005-0000-4000-8000-000000000002'::uuid,  'vet-office',       2,  0, 1,  3, 0, null,      0, 3),
    ('f05e0001-0000-4000-8000-000000000001'::uuid, 'f05e0005-0000-4000-8000-000000000003'::uuid,  'flyer',            4,  1, 1,  5, 0, null,      0, 4),
    -- Link deleted (FK set null) and the channel is not a preset: renders the raw key.
    ('f05e0001-0000-4000-8000-000000000001'::uuid, null::uuid,                                     'nextdoor',        30, 24, 1,  2, 0, null,      0, 9),
    -- Sesame (Alex): a few direct days, the busier one last week.
    ('f05e0001-0000-4000-8000-000000000002'::uuid, null::uuid,                                     'direct',          23,  2, 7,  1, 0, 9,        25, 1),
    -- Waffles (Alex): direct traffic from before the medical hold.
    ('f05e0001-0000-4000-8000-000000000003'::uuid, null::uuid,                                     'direct',          60, 45, 2,  5, 0, null,      0, 3),
    -- Biscuit (Alex, adopted): stops 20 days ago.
    ('f05e0001-0000-4000-8000-000000000005'::uuid, null::uuid,                                     'direct',          80, 20, 1,  6, 0, null,      0, 2),
    -- Señor Whiskers (Bianca): one viral day.
    ('f05e0001-0000-4000-8000-000000000006'::uuid, 'f05e0005-0000-4000-8000-000000000107'::uuid,  'tiktok',          20,  0, 1, 18, 0, 3,     12480, 3),
    ('f05e0001-0000-4000-8000-000000000006'::uuid, null::uuid,                                     'direct',          20,  0, 4,  2, 0, null,      0, 5),
    -- Juniper (Carlos): this week only, no links.
    ('f05e0001-0000-4000-8000-000000000009'::uuid, null::uuid,                                     'direct',           5,  0, 1,  6, 0, null,      0, 1),
    -- Tumbleweed (Carlos): nothing in the last 30 days.
    ('f05e0001-0000-4000-8000-000000000010'::uuid, null::uuid,                                     'direct',          60, 45, 2,  5, 0, null,      0, 3)
),
cities (list) as (
  select array[
    'San Francisco', 'Oakland', 'Berkeley', null, 'Daly City', 'San José',
    'Sausalito', 'São Paulo', 'Zürich',
    'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch',
    'Portland', 'Brooklyn'
  ]::text[]
),
generated as (
  select
    s.pet_id,
    s.link_id,
    s.channel_key,
    c.list[1 + (d + s.salt) % 12] as city,
    current_date - d as day,
    s.base + ((d * 7 + s.salt) % 5)
      + case when d < 7 then s.boost7 else 0 end
      + case when d = s.spike_day then s.spike_views else 0 end as views
  from spec s
  cross join cities c
  cross join lateral generate_series(s.newest, s.oldest) as d
  where (d - s.newest) % s.step = 0
    and exists (select 1 from public.pets p where p.id = s.pet_id)
    and (s.link_id is null or exists (select 1 from public.tracked_links l where l.id = s.link_id))
)
insert into public.analytics_daily (
  pet_id, link_id, channel_key, city, day, views, approx_visitors, form_opens, updated_at
)
select
  pet_id, link_id, channel_key, city, day, views,
  case when views = 0 then 0 else greatest(1, views * 3 / 4) end,
  views / 8,
  now()
from generated;

-- One-off rows the generator cannot express.
insert into public.analytics_daily (
  pet_id, link_id, channel_key, city, day, views, approx_visitors, form_opens, updated_at
)
select v.pet_id, v.link_id, v.channel_key, v.city, current_date - v.days_ago,
       v.views, v.approx_visitors, v.form_opens, now()
from (
values
  -- Mochi: a city with 0 views must not appear in Top cities.
  ('f05e0001-0000-4000-8000-000000000001'::uuid, null::uuid, 'direct', 'Reno'::text, 0, 0, 0, 1),
  -- Pepper: 2 views, 3 form opens (3 inquiries below → 150% conversion).
  ('f05e0001-0000-4000-8000-000000000007'::uuid, null::uuid, 'direct', 'Oakland',    4, 2, 2, 3),
  -- Marbles: form opens with no views.
  ('f05e0001-0000-4000-8000-000000000008'::uuid, null::uuid, 'direct', null,         1, 0, 0, 2),
  -- Kitten litter #4: one view today, no city.
  ('f05e0001-0000-4000-8000-000000000012'::uuid, null::uuid, 'direct', null,         0, 1, 1, 0)
) as v(pet_id, link_id, channel_key, city, days_ago, views, approx_visitors, form_opens)
where exists (select 1 from public.pets p where p.id = v.pet_id);

-- ---------------------------------------------------------------------------
-- 4. analytics_owner_daily (foster-me funnel on /profile/links)
-- ---------------------------------------------------------------------------
-- Same generator. pet_taps = views * tap_pct / 100; tap_pct above 100 means
-- one visitor opened several pets.

delete from public.analytics_owner_daily where owner_id::text like 'f05e%';

with spec (owner_id, link_id, channel_key, oldest, newest, step, base, boost7, spike_day, spike_views, salt, tap_pct) as (
  values
    ('f05e0000-0000-4000-8000-000000000001'::uuid, 'f05e0005-0000-4000-8000-000000000101'::uuid, 'default',         59,  0, 1,  8, 4, null::int,   0, 1,  45),
    ('f05e0000-0000-4000-8000-000000000001'::uuid, 'f05e0005-0000-4000-8000-000000000004'::uuid, 'instagram',        1,  0, 1, 38, 0, null,        0, 2,  60),
    ('f05e0000-0000-4000-8000-000000000001'::uuid, 'f05e0005-0000-4000-8000-000000000102'::uuid, 'facebook',        39,  0, 1,  5, 0, null,        0, 3,  35),
    ('f05e0000-0000-4000-8000-000000000001'::uuid, 'f05e0005-0000-4000-8000-000000000103'::uuid, 'farmers-market',  19,  0, 7,  4, 0, null,        0, 4, 180),
    ('f05e0000-0000-4000-8000-000000000001'::uuid, 'f05e0005-0000-4000-8000-000000000104'::uuid, 'tiktok',          89, 10, 1, 10, 0, 40,        900, 5,  25),
    -- Untagged: no link id, empty channel stored as direct.
    ('f05e0000-0000-4000-8000-000000000001'::uuid, null::uuid,                                    'direct',         119,  0, 3,  2, 0, null,        0, 6,  50)
),
cities (list) as (
  select array[
    'San Francisco', 'Oakland', 'Berkeley', null, 'Daly City', 'San José',
    'Sausalito', 'São Paulo', 'Zürich',
    'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch',
    'Portland', 'Brooklyn'
  ]::text[]
),
generated as (
  select
    s.owner_id,
    s.link_id,
    s.channel_key,
    c.list[1 + (d + s.salt) % 12] as city,
    current_date - d as day,
    s.base + ((d * 7 + s.salt) % 5)
      + case when d < 7 then s.boost7 else 0 end
      + case when d = s.spike_day then s.spike_views else 0 end as views,
    s.tap_pct
  from spec s
  cross join cities c
  cross join lateral generate_series(s.newest, s.oldest) as d
  where (d - s.newest) % s.step = 0
    and exists (select 1 from public.users u where u.id = s.owner_id)
    and (s.link_id is null or exists (select 1 from public.tracked_links l where l.id = s.link_id))
)
insert into public.analytics_owner_daily (
  owner_id, link_id, channel_key, city, day, views, approx_visitors, pet_taps, updated_at
)
select
  owner_id, link_id, channel_key, city, day, views,
  case when views = 0 then 0 else greatest(1, views * 3 / 4) end,
  views * tap_pct / 100,
  now()
from generated;

-- ---------------------------------------------------------------------------
-- 5. Foster-me click-throughs (pet_viewed with via_foster_me)
-- ---------------------------------------------------------------------------
-- A visitor who opens a pet from Alex's foster-me page lands a pet_viewed with
-- that page's link_id and channel_key. Each pet_taps value above is split
-- across Alex's pets by weight and rounded, so a pet's foster-me views add up
-- to roughly the owner's pet taps for the same link, day, and city.
--
--   recent_pct  scales the last 7 days (Sesame's application is pending, so
--               fewer people open her: "Quieter than last week")
--   until_days  no click-throughs newer than this (Biscuit stopped at adoption)
--
-- Untagged taps (link_id null, channel direct) share a key with the direct
-- rows from section 3, so they add to those rows instead of failing.

with split (pet_id, weight, recent_pct, until_days) as (
  values
    ('f05e0001-0000-4000-8000-000000000001'::uuid, 40, 100,  0),  -- Mochi
    ('f05e0001-0000-4000-8000-000000000002'::uuid, 25,  30,  0),  -- Sesame
    ('f05e0001-0000-4000-8000-000000000004'::uuid, 15, 100,  0),  -- Kiwi
    ('f05e0001-0000-4000-8000-000000000003'::uuid, 10, 100,  0),  -- Waffles
    ('f05e0001-0000-4000-8000-000000000005'::uuid, 10, 100, 20)   -- Biscuit
),
taps as (
  select
    sp.pet_id,
    o.link_id,
    o.channel_key,
    o.city,
    o.day,
    (o.pet_taps * sp.weight
      * case when o.day > current_date - 7 then sp.recent_pct else 100 end
      + 5000) / 10000 as views
  from public.analytics_owner_daily o
  join split sp on o.day <= current_date - sp.until_days
  where o.owner_id = 'f05e0000-0000-4000-8000-000000000001'::uuid
    and exists (
      select 1 from public.pets p
       where p.id = sp.pet_id and p.owner_id = o.owner_id and p.deleted_at is null
    )
)
insert into public.analytics_daily (
  pet_id, link_id, channel_key, city, day, views, approx_visitors, form_opens, updated_at
)
select
  pet_id, link_id, channel_key, city, day, views,
  greatest(1, views * 3 / 4),
  views / 6,
  now()
from taps
where views > 0
on conflict (pet_id, link_id, channel_key, city, day) do update
  set views           = analytics_daily.views + excluded.views,
      approx_visitors = analytics_daily.approx_visitors + excluded.approx_visitors,
      form_opens      = analytics_daily.form_opens + excluded.form_opens,
      updated_at      = excluded.updated_at;

-- ---------------------------------------------------------------------------
-- 6. Inquiries with sources
-- ---------------------------------------------------------------------------
-- Pet analytics counts inquiries by target_pet_id. The owner funnel counts
-- inquiries with via_foster_me = true, by source_link_id (null = untagged).

insert into public.inquiries (
  id, target_user_id, target_pet_id, sender_name, sender_email, message,
  zip_code, source_link_id, source_channel_key, via_foster_me, self_reported_source, created_at
)
select * from (
values
  -- Mochi
  (
    'f05e0004-0000-4000-8000-000000000101'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'f05e0001-0000-4000-8000-000000000001'::uuid,
    'Hana Sato', 'hana.sato@seed.fosterfolio.test',
    'Saw the lawn sign on my walk. Is Mochi okay with apartment living?',
    '94110', 'f05e0005-0000-4000-8000-000000000001'::uuid, 'lawn_sign', false, 'Lawn sign',
    now() - interval '1 day'
  ),
  (
    'f05e0004-0000-4000-8000-000000000102'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'f05e0001-0000-4000-8000-000000000001'::uuid,
    'Leo Martin', 'leo.martin@seed.fosterfolio.test',
    'Found your foster page on Instagram — Mochi is adorable!',
    '94607', 'f05e0005-0000-4000-8000-000000000004'::uuid, 'instagram', true, null,
    now() - interval '6 hours'
  ),
  (
    'f05e0004-0000-4000-8000-000000000103'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'f05e0001-0000-4000-8000-000000000001'::uuid,
    'Ana Costa', 'ana.costa@seed.fosterfolio.test',
    'Would Mochi do well with a retired couple and a quiet house?',
    null, 'f05e0005-0000-4000-8000-000000000101'::uuid, 'default', true, 'A friend sent me the link',
    now() - interval '12 days'
  ),
  -- Outside 30d: only the "all" range shows it.
  (
    'f05e0004-0000-4000-8000-000000000104'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'f05e0001-0000-4000-8000-000000000001'::uuid,
    'Sam Okafor', 'sam.okafor@seed.fosterfolio.test',
    'Scanned the QR on his bandana at the park.',
    '94117', null, 'direct', false, null,
    now() - interval '40 days'
  ),
  -- Via an archived link.
  (
    'f05e0004-0000-4000-8000-000000000105'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'f05e0001-0000-4000-8000-000000000001'::uuid,
    'Riley Chen', 'riley.chen@seed.fosterfolio.test',
    'The TikTok of Mochi and the vacuum got me. Still available?',
    null, 'f05e0005-0000-4000-8000-000000000104'::uuid, 'tiktok', true, 'TikTok',
    now() - interval '50 days'
  ),
  -- A link with no views and no source_channel_key: dropped from the pet
  -- Links table, but counted under ALEXNEW1 in the owner funnel.
  (
    'f05e0004-0000-4000-8000-000000000106'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'f05e0001-0000-4000-8000-000000000001'::uuid,
    'Noor Haddad', 'noor.haddad@seed.fosterfolio.test',
    'Picked up your flyer at the coffee shop this morning.',
    '94103', 'f05e0005-0000-4000-8000-000000000105'::uuid, null, true, null,
    now() - interval '1 hour'
  ),
  -- Untagged foster-me inquiry with no pet.
  (
    'f05e0004-0000-4000-8000-000000000107'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    null::uuid,
    'Gabe Lindqvist', 'gabe.lindqvist@seed.fosterfolio.test',
    'Not sure which pet yet — we would love something calm and small.',
    null, null, null, true, null,
    now() - interval '3 days'
  ),
  -- Sesame: one direct, one via Facebook.
  (
    'f05e0004-0000-4000-8000-000000000110'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'f05e0001-0000-4000-8000-000000000002'::uuid,
    'Ivy Romero', 'ivy.romero@seed.fosterfolio.test',
    'Does Sesame get along with dogs?',
    null, null, 'direct', false, null,
    now() - interval '5 days'
  ),
  (
    'f05e0004-0000-4000-8000-000000000111'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'f05e0001-0000-4000-8000-000000000002'::uuid,
    'Owen Price', 'owen.price@seed.fosterfolio.test',
    'Saw the rescue group post. Happy to wait if applications are pending.',
    '94609', 'f05e0005-0000-4000-8000-000000000102'::uuid, 'facebook', true, null,
    now() - interval '12 days'
  ),
  -- Biscuit, before adoption.
  (
    'f05e0004-0000-4000-8000-000000000115'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'f05e0001-0000-4000-8000-000000000005'::uuid,
    'Dee Walsh', 'dee.walsh@seed.fosterfolio.test',
    'Biscuit looks like the beagle I grew up with.',
    null, null, 'direct', false, null,
    now() - interval '25 days'
  ),
  (
    'f05e0004-0000-4000-8000-000000000116'::uuid,
    'f05e0000-0000-4000-8000-000000000001'::uuid,
    'f05e0001-0000-4000-8000-000000000005'::uuid,
    'Pat Moreno', 'pat.moreno@seed.fosterfolio.test',
    'We live two doors down — could we meet Biscuit this weekend?',
    '94114', 'f05e0005-0000-4000-8000-000000000101'::uuid, 'default', true, null,
    now() - interval '22 days'
  ),
  -- Pepper (Bianca): 3 inquiries on 2 views.
  (
    'f05e0004-0000-4000-8000-000000000120'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'f05e0001-0000-4000-8000-000000000007'::uuid,
    'Kai Brennan', 'kai.brennan@seed.fosterfolio.test',
    'Pepper! Is she okay with a cat who stands his ground?',
    null, null, 'direct', false, null,
    now() - interval '4 days'
  ),
  (
    'f05e0004-0000-4000-8000-000000000121'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'f05e0001-0000-4000-8000-000000000007'::uuid,
    'Lena Fischer', 'lena.fischer@seed.fosterfolio.test',
    'A friend forwarded her page. We would love to meet her.',
    null, null, null, false, 'A friend',
    now() - interval '3 days'
  ),
  (
    'f05e0004-0000-4000-8000-000000000122'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'f05e0001-0000-4000-8000-000000000007'::uuid,
    'Rafa Ortiz', 'rafa.ortiz@seed.fosterfolio.test',
    'Following up on my partner''s message — we are both in!',
    null, null, null, false, null,
    now() - interval '2 days'
  ),
  -- Marbles (Bianca): an inquiry with 0 views.
  (
    'f05e0004-0000-4000-8000-000000000125'::uuid,
    'f05e0000-0000-4000-8000-000000000002'::uuid,
    'f05e0001-0000-4000-8000-000000000008'::uuid,
    'Theo Grant', 'theo.grant@seed.fosterfolio.test',
    'We already have a guinea pig pen big enough for two.',
    null, null, 'direct', false, null,
    now() - interval '1 day'
  ),
  -- Juniper (Carlos)
  (
    'f05e0004-0000-4000-8000-000000000130'::uuid,
    'f05e0000-0000-4000-8000-000000000003'::uuid,
    'f05e0001-0000-4000-8000-000000000009'::uuid,
    'Mara Quinn', 'mara.quinn@seed.fosterfolio.test',
    'We do agility on weekends. Juniper sounds like a great fit.',
    '78704', null, 'direct', false, null,
    now() - interval '2 hours'
  )
) as v(
  id, target_user_id, target_pet_id, sender_name, sender_email, message,
  zip_code, source_link_id, source_channel_key, via_foster_me, self_reported_source, created_at
)
where exists (select 1 from public.users u where u.id = v.target_user_id)
  and (v.target_pet_id is null or exists (select 1 from public.pets p where p.id = v.target_pet_id))
  and (v.source_link_id is null or exists (select 1 from public.tracked_links l where l.id = v.source_link_id))
on conflict (id) do update
  set target_user_id       = excluded.target_user_id,
      target_pet_id        = excluded.target_pet_id,
      sender_name          = excluded.sender_name,
      sender_email         = excluded.sender_email,
      message              = excluded.message,
      zip_code             = excluded.zip_code,
      source_link_id       = excluded.source_link_id,
      source_channel_key   = excluded.source_channel_key,
      via_foster_me        = excluded.via_foster_me,
      self_reported_source = excluded.self_reported_source,
      created_at           = excluded.created_at;

-- ---------------------------------------------------------------------------
-- Summary — the npm script prints these rows
-- ---------------------------------------------------------------------------

select entity, rows
from (
  select 1 as sort, 'tracked_links (this file)' as entity, count(*)::int as rows
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
