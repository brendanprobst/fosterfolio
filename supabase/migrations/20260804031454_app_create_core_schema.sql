-- Fosterfolio core schema (Checkpoint 1).
-- Product tables, sync trigger, storage bucket/RPC, and defense-in-depth RLS.
-- Ownership for API traffic is enforced in use cases: the service role bypasses RLS.

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
  search_vector tsvector
    generated always as (to_tsvector('english', coalesce(display_name, ''))) stored
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
