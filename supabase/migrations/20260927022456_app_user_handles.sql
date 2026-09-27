-- Optional unique vanity handle for /@handle URLs.
-- Nullable: existing rows need no backfill; users claim a handle later.
-- Unique across all rows, including soft-deleted, so a deleted account
-- keeps the handle reserved. Lookup still filters deleted_at is null.
-- Stored lowercase only; the domain layer must normalize before save.

alter table public.users
  add column handle text;

alter table public.users
  add constraint users_handle_lowercase
  check (handle is null or handle = lower(handle));

alter table public.users
  add constraint users_handle_format
  check (
    handle is null
    or handle ~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$'
  );

create unique index users_handle_unique
  on public.users (handle);
