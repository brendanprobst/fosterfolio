-- Master migration. Creates an empty database at the 2026-10-18 schema.
-- Rebuild of supabase/feature-migrations in timestamp order.
-- Do not apply this on a database that already ran those feature migrations.
-- Previous master: archive/LATEST_20261010.sql

-- Fosterfolio v1 schema in one shot: signup allowlist, product tables
-- (including handle and pet photos), storage bucket, and RLS.
-- Replaces the earlier allowlist, core, handle, and photos migrations.
-- Apply only to an empty database. Dev must be dropped and re-seeded;
-- this file is not a delta on top of those four versions.

-- Email allowlist gate for signup (covers email/password and OAuth providers).
-- Apply in the Supabase SQL editor or via the Supabase CLI.
--
-- The gate is OPT-IN behind a feature flag stored in public.allowlist_settings.
-- Applying this migration creates the table, function and trigger but leaves
-- the flag DISABLED, so existing signup behavior is unchanged. Flip it on with:
--
--   select public.set_allowlist_enabled(true);
--
-- (and set EMAIL_ALLOWLIST_ENABLED=true in the API env).
--
-- IMPORTANT — schema permissions:
-- Recent Supabase projects restrict CREATE in the `auth` schema, so all helper
-- functions live under `public`. The trigger itself still attaches to
-- `auth.users`; if your SQL Editor role lacks TRIGGER privilege on
-- `auth.users`, run this migration via the Supabase CLI / direct psql as the
-- `postgres` role, or fall back to API-only enforcement (the API middleware
-- enforces the same allowlist via `EMAIL_ALLOWLIST_ENABLED`).
--
-- Add a friend:    insert into public.allowed_emails (email) values ('them@example.com');
-- Remove a friend: delete from public.allowed_emails where email = 'them@example.com';

create extension if not exists citext;

create table if not exists public.allowed_emails (
  id          uuid primary key default gen_random_uuid(),
  email       citext not null unique,
  note        text,
  created_at  timestamptz not null default now()
);

-- Single-row settings table holding the runtime feature flag. The CHECK
-- constraint pins it to one row so callers do not need to know an id.
create table if not exists public.allowlist_settings (
  singleton  boolean primary key default true,
  enabled    boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint allowlist_settings_singleton_chk check (singleton = true)
);

insert into public.allowlist_settings (singleton, enabled)
values (true, false)
on conflict (singleton) do nothing;

-- Backfill any pre-existing accounts so flipping the flag on later does not
-- lock current users out. Wrapped in a DO block with an insufficient_privilege
-- handler because some Supabase roles cannot read auth.users from the SQL
-- editor; the rest of the migration must still succeed.
do $$
begin
  insert into public.allowed_emails (email, note)
  select email, 'auto-seeded from existing auth.users'
  from auth.users
  where email is not null
  on conflict (email) do nothing;
exception
  when insufficient_privilege then
    raise notice 'Skipping auth.users backfill (insufficient privilege). Add existing emails manually with: insert into public.allowed_emails (email) values (...);';
end
$$;

-- Convenience helper: toggle the flag without remembering the singleton key.
create or replace function public.set_allowlist_enabled(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.allowlist_settings
     set enabled = p_enabled,
         updated_at = now()
   where singleton = true;
  return p_enabled;
end;
$$;

revoke all on function public.set_allowlist_enabled (boolean) from public;
grant execute on function public.set_allowlist_enabled (boolean) to service_role;

-- Trigger function lives in `public` (not `auth`) because Supabase no longer
-- permits CREATE in the auth schema from the SQL editor. SECURITY DEFINER
-- ensures it runs as the function owner (the migration runner — typically
-- `postgres`) so it can read public.allowlist_settings / public.allowed_emails
-- regardless of who is performing the auth.users insert.
create or replace function public.enforce_allowed_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_enabled boolean;
begin
  select enabled into is_enabled
    from public.allowlist_settings
   where singleton = true;

  if coalesce(is_enabled, false) = false then
    return new;
  end if;

  if new.email is null
     or not exists (select 1 from public.allowed_emails where email = new.email) then
    raise exception 'EMAIL_NOT_APPROVED: % is not on the allow list', new.email
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- supabase_auth_admin is the role that performs `insert into auth.users` for
-- every signup path; granting EXECUTE explicitly avoids surprises if Postgres
-- defaults change. service_role and postgres are included for admin tooling
-- and direct psql runs.
revoke all on function public.enforce_allowed_email () from public;
grant execute on function public.enforce_allowed_email () to supabase_auth_admin, service_role, postgres;

-- Clean up any prior version of the function in the auth schema (left over
-- from earlier iterations of this migration). Wrapped because the role may
-- lack DROP rights on auth.* — that is expected and not fatal.
do $$
begin
  execute 'drop function if exists auth.enforce_allowed_email() cascade';
exception
  when insufficient_privilege then
    null;
end
$$;

-- BEFORE INSERT trigger blocks signups whose email is not on the allowlist
-- (only when the feature flag is on). Supabase surfaces RAISE EXCEPTION text
-- to the client, so we use the stable prefix `EMAIL_NOT_APPROVED:` that the
-- web UI matches for a friendly error.
drop trigger if exists enforce_allowed_email on auth.users;
create trigger enforce_allowed_email
  before insert on auth.users
  for each row execute function public.enforce_allowed_email();

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  zip_code text,
  city text,
  state text,
  lat double precision,
  lng double precision,
  social_links jsonb,
  shelters_text text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- Nullable vanity handle for /@handle. Lowercase, format-checked, unique
  -- including soft-deleted rows so a deleted account keeps the name reserved.
  handle text,
  search_vector tsvector
    generated always as (to_tsvector('english', coalesce(display_name, ''))) stored,
  constraint users_handle_lowercase
    check (handle is null or handle = lower(handle)),
  constraint users_handle_format
    check (
      handle is null
      or handle ~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$'
    )
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  species text not null,
  breed text,
  age_value int,
  age_unit text,
  sex text,
  size text,
  status text not null default 'actively_fostering',
  sub_status text,
  shelter_link_name text,
  shelter_link_url text,
  primary_photo_url text,
  -- Index 0 is the cover; the API also writes that URL to primary_photo_url.
  photos jsonb not null default '[]'::jsonb,
  bio_markdown text,
  important_links jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  search_vector tsvector
    generated always as (to_tsvector('english', coalesce(name, ''))) stored
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users (id) on delete cascade,
  post_type text not null default 'general',
  pet_id uuid references public.pets (id) on delete cascade,
  body_text text,
  image_url text,
  geo_lock text not null default 'local',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint posts_pet_update_requires_pet
    check (post_type <> 'pet_update' or pet_id is not null)
);

create table if not exists public.profile_stars (
  id uuid primary key default gen_random_uuid(),
  starred_user_id uuid not null references public.users (id) on delete cascade,
  starrer_user_id uuid references public.users (id) on delete cascade,
  session_token text not null,
  created_at timestamptz not null default now(),
  unique (starred_user_id, session_token)
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.users (id) on delete cascade,
  target_pet_id uuid references public.pets (id) on delete set null,
  sender_name text not null,
  sender_email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists pets_owner_id_active_idx
  on public.pets (owner_id)
  where deleted_at is null;

create index if not exists posts_author_id_active_idx
  on public.posts (author_id)
  where deleted_at is null;

create index if not exists posts_pet_id_active_idx
  on public.posts (pet_id)
  where deleted_at is null;

create index if not exists posts_feed_keyset_idx
  on public.posts (created_at desc, id desc)
  where deleted_at is null;

create index if not exists profile_stars_starred_user_id_idx
  on public.profile_stars (starred_user_id);

create index if not exists pets_search_vector_idx
  on public.pets using gin (search_vector);

create index if not exists users_search_vector_idx
  on public.users using gin (search_vector);

-- Unique across all rows, including soft-deleted. Multiple NULLs are allowed.
create unique index users_handle_unique
  on public.users (handle);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pets_touch_updated_at on public.pets;
create trigger pets_touch_updated_at
  before update on public.pets
  for each row execute function public.touch_updated_at();

drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- auth.users → public.users sync
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role, postgres;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill existing auth users (best-effort; SQL editor roles may lack auth.users read).
do $$
begin
  insert into public.users (id, email)
  select id, email
  from auth.users
  where email is not null
  on conflict (id) do nothing;
exception
  when insufficient_privilege then
    raise notice 'Skipping auth.users backfill (insufficient privilege).';
end
$$;

-- ---------------------------------------------------------------------------
-- Storage bucket + usage RPC
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('fosterfolio-media', 'fosterfolio-media', true)
on conflict (id) do nothing;

create or replace function public.user_storage_bytes(p_user_id uuid)
returns bigint
language sql
security definer
set search_path = public, storage
as $$
  select coalesce(sum((metadata->>'size')::bigint), 0)
  from storage.objects
  where bucket_id = 'fosterfolio-media'
    and (storage.foldername(name))[1] = p_user_id::text;
$$;

revoke all on function public.user_storage_bytes(uuid) from public;
grant execute on function public.user_storage_bytes(uuid) to service_role;

-- Public read; authenticated write only into own folder /{user_id}/...
drop policy if exists "fosterfolio_media_public_read" on storage.objects;
create policy "fosterfolio_media_public_read"
  on storage.objects
  for select
  using (bucket_id = 'fosterfolio-media');

drop policy if exists "fosterfolio_media_owner_insert" on storage.objects;
create policy "fosterfolio_media_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'fosterfolio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "fosterfolio_media_owner_update" on storage.objects;
create policy "fosterfolio_media_owner_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'fosterfolio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'fosterfolio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "fosterfolio_media_owner_delete" on storage.objects;
create policy "fosterfolio_media_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'fosterfolio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- RLS (defense in depth; API service role bypasses these)
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.pets enable row level security;
alter table public.posts enable row level security;
alter table public.profile_stars enable row level security;
alter table public.inquiries enable row level security;

-- users
drop policy if exists "users_public_read" on public.users;
create policy "users_public_read"
  on public.users for select
  using (deleted_at is null);

drop policy if exists "users_owner_update" on public.users;
create policy "users_owner_update"
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- pets
drop policy if exists "pets_public_read" on public.pets;
create policy "pets_public_read"
  on public.pets for select
  using (deleted_at is null);

drop policy if exists "pets_owner_insert" on public.pets;
create policy "pets_owner_insert"
  on public.pets for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "pets_owner_update" on public.pets;
create policy "pets_owner_update"
  on public.pets for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "pets_owner_delete" on public.pets;
create policy "pets_owner_delete"
  on public.pets for delete
  to authenticated
  using (auth.uid() = owner_id);

-- posts
drop policy if exists "posts_public_read" on public.posts;
create policy "posts_public_read"
  on public.posts for select
  using (deleted_at is null);

drop policy if exists "posts_owner_insert" on public.posts;
create policy "posts_owner_insert"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "posts_owner_update" on public.posts;
create policy "posts_owner_update"
  on public.posts for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "posts_owner_delete" on public.posts;
create policy "posts_owner_delete"
  on public.posts for delete
  to authenticated
  using (auth.uid() = author_id);

-- profile_stars (public insert + read)
drop policy if exists "profile_stars_public_read" on public.profile_stars;
create policy "profile_stars_public_read"
  on public.profile_stars for select
  using (true);

drop policy if exists "profile_stars_public_insert" on public.profile_stars;
create policy "profile_stars_public_insert"
  on public.profile_stars for insert
  with check (true);

-- inquiries (public insert; no public read in MVP)
drop policy if exists "inquiries_public_insert" on public.inquiries;
create policy "inquiries_public_insert"
  on public.inquiries for insert
  with check (true);

drop policy if exists "inquiries_owner_read" on public.inquiries;
create policy "inquiries_owner_read"
  on public.inquiries for select
  to authenticated
  using (auth.uid() = target_user_id);

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

-- Fosterfolio v2: length bounds on owner-typed tracked-link text (review item S8).
-- The API enforces the same limits (CHANNEL_NAME_MAX_LENGTH, CHANNEL_KEY_MAX_LENGTH,
-- TRACKED_LINK_LABEL_MAX_LENGTH). These checks stop anything that skips the API.
-- channel_key is derived from channel_name, but lowercasing can lengthen a few letters,
-- so it has its own bound. A null label passes.
-- Fails if a row already breaks a bound. Find them with:
--   select id, char_length(channel_name), char_length(channel_key), char_length(label)
--     from public.tracked_links
--    where char_length(channel_name) > 40 or char_length(channel_key) > 64
--       or char_length(label) > 100;

alter table public.tracked_links
  drop constraint if exists tracked_links_channel_name_length;

alter table public.tracked_links
  add constraint tracked_links_channel_name_length
  check (char_length(channel_name) <= 40);

alter table public.tracked_links
  drop constraint if exists tracked_links_channel_key_length;

alter table public.tracked_links
  add constraint tracked_links_channel_key_length
  check (char_length(channel_key) <= 64);

alter table public.tracked_links
  drop constraint if exists tracked_links_label_length;

alter table public.tracked_links
  add constraint tracked_links_label_length
  check (char_length(label) <= 100);
