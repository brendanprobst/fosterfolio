-- Fosterfolio v2 slice 1: tracked links, analytics rollup table, notifications.
-- Inquiry source columns are nullable and unused by the current create-inquiry path.
-- The API writes with the service role (RLS bypass). Owners can read their own rows.
-- analytics_daily and notifications have no authenticated write policies; the rollup
-- job and the dispatcher insert with the service role.

alter table public.pets
  add column if not exists analytics_stopped_at timestamptz;

alter table public.inquiries
  add column if not exists zip_code text,
  add column if not exists source_link_id uuid,
  add column if not exists source_channel_key text,
  add column if not exists self_reported_source text;

create table if not exists public.tracked_links (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  owner_id uuid not null references public.users (id) on delete cascade,
  code text not null,
  channel_key text not null,
  channel_name text not null,
  label text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint tracked_links_code_unique unique (code),
  constraint tracked_links_code_format check (code ~ '^[A-Za-z0-9_-]{6,8}$')
);

create index if not exists tracked_links_pet_id_idx
  on public.tracked_links (pet_id);

create index if not exists tracked_links_owner_channel_idx
  on public.tracked_links (owner_id, channel_key);

alter table public.inquiries
  drop constraint if exists inquiries_source_link_id_fkey;

alter table public.inquiries
  add constraint inquiries_source_link_id_fkey
  foreign key (source_link_id) references public.tracked_links (id) on delete set null;

create table if not exists public.analytics_daily (
  pet_id uuid not null references public.pets (id) on delete cascade,
  link_id uuid references public.tracked_links (id) on delete set null,
  channel_key text not null,
  city text,
  day date not null,
  views int not null default 0,
  approx_visitors int not null default 0,
  form_opens int not null default 0,
  updated_at timestamptz not null default now()
);

create unique index if not exists analytics_daily_uniq
  on public.analytics_daily (
    pet_id,
    coalesce(link_id, '00000000-0000-0000-0000-000000000000'::uuid),
    channel_key,
    coalesce(city, ''),
    day
  );

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  archived_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

create table if not exists public.notification_preferences (
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  email_enabled boolean not null default true,
  primary key (user_id, type)
);

-- ---------------------------------------------------------------------------
-- RLS (defense in depth; API service role bypasses these)
-- ---------------------------------------------------------------------------

alter table public.tracked_links enable row level security;
alter table public.analytics_daily enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists "tracked_links_owner_read" on public.tracked_links;
create policy "tracked_links_owner_read"
  on public.tracked_links for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "analytics_daily_owner_read" on public.analytics_daily;
create policy "analytics_daily_owner_read"
  on public.analytics_daily for select
  to authenticated
  using (
    exists (
      select 1
      from public.pets
      where pets.id = analytics_daily.pet_id
        and pets.owner_id = auth.uid()
    )
  );

drop policy if exists "notifications_recipient_read" on public.notifications;
create policy "notifications_recipient_read"
  on public.notifications for select
  to authenticated
  using (auth.uid() = recipient_id);

drop policy if exists "notification_preferences_owner_read" on public.notification_preferences;
create policy "notification_preferences_owner_read"
  on public.notification_preferences for select
  to authenticated
  using (auth.uid() = user_id);
