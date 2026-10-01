-- Ordered pet gallery. Index 0 is the cover; the API also writes that URL to primary_photo_url.
alter table public.pets
  add column if not exists photos jsonb not null default '[]'::jsonb;
