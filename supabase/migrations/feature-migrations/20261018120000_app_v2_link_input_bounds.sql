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
