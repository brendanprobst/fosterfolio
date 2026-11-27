-- Fosterfolio v2: handle aliases and the handle change cooldown.
--
-- user_handle_aliases: every handle a user used to have. The old /@handle URL keeps
-- resolving to the current profile, and nobody else can claim the handle. Aliases are
-- reserved forever for the original owner, so the primary key on handle is the guard.
-- Existing renames are not backfilled.
--
-- user_handle_changes: one row per replaced or cleared handle (a first handle is free).
-- The API allows 2 changes in a rolling 30 days and counts rows here.
--
-- Both tables are read and written only by the API with the service role. RLS is on with
-- no policies, so anon and authenticated roles get nothing.

create table if not exists public.user_handle_aliases (
  handle text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_handle_aliases_lowercase
    check (handle = lower(handle)),
  constraint user_handle_aliases_format
    check (handle ~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$')
);

create index if not exists user_handle_aliases_user_id_idx
  on public.user_handle_aliases (user_id);

create table if not exists public.user_handle_changes (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  changed_at timestamptz not null default now()
);

create index if not exists user_handle_changes_user_changed_idx
  on public.user_handle_changes (user_id, changed_at desc);

alter table public.user_handle_aliases enable row level security;
alter table public.user_handle_changes enable row level security;
