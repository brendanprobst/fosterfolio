-- Fosterfolio v2 slice 5b: foster-me is a link target, and owner-level
-- preview views land in analytics_owner_daily (analytics_daily stays pet-keyed).
-- The API writes with the service role (RLS bypass). Owners can read their own rows.
-- analytics_owner_daily has no authenticated write policy; the rollup inserts
-- with the service role. Existing tracked_links rows backfill to target = 'pet'.

alter table public.tracked_links
  add column if not exists target text not null default 'pet';

alter table public.tracked_links
  drop constraint if exists tracked_links_target_check;

alter table public.tracked_links
  add constraint tracked_links_target_check
  check (target in ('pet', 'foster_me'));

alter table public.tracked_links
  alter column pet_id drop not null;

alter table public.tracked_links
  drop constraint if exists tracked_links_target_pet_consistency;

alter table public.tracked_links
  add constraint tracked_links_target_pet_consistency
  check ((target = 'pet') = (pet_id is not null));

create index if not exists tracked_links_owner_target_idx
  on public.tracked_links (owner_id, target)
  where archived_at is null;

create table if not exists public.analytics_owner_daily (
  owner_id uuid not null references public.users (id) on delete cascade,
  link_id uuid references public.tracked_links (id) on delete set null,
  channel_key text not null,
  city text,
  day date not null,
  views int not null default 0,
  approx_visitors int not null default 0,
  pet_taps int not null default 0,
  updated_at timestamptz not null default now()
);

create unique index if not exists analytics_owner_daily_uniq
  on public.analytics_owner_daily (
    owner_id,
    coalesce(link_id, '00000000-0000-0000-0000-000000000000'::uuid),
    channel_key,
    coalesce(city, ''),
    day
  );

alter table public.inquiries
  add column if not exists via_foster_me boolean not null default false;

alter table public.analytics_owner_daily enable row level security;

drop policy if exists "analytics_owner_daily_owner_read" on public.analytics_owner_daily;
create policy "analytics_owner_daily_owner_read"
  on public.analytics_owner_daily for select
  to authenticated
  using (auth.uid() = owner_id);
