---
name: Fosterfolio MVP
overview: Implementation plan for the Fosterfolio MVP on the Lattice scaffold — scope boundary, locked decisions, amended data model, and seven checkpoints sized for agent execution. API core is one serial agent lane; web feature work parallelizes after its foundation lands.
todos:
  - id: cp0-supabase-tooling
    content: "Checkpoint 0 — Supabase CLI + MCP wired (root supabase/ layout, npm run supabase:push, project linked, env files populated). Prerequisite, handled outside this plan."
    status: completed
  - id: cp1-foundation
    content: "Checkpoint 1 — Foundation: migrations, per-route auth, error/container/route restructure, DataAdapter extensions, public-vs-owner DTO convention"
    status: pending
  - id: cp2-user-pet
    content: "Checkpoint 2 — User and Pet domains end to end with ownership enforcement and soft delete"
    status: pending
  - id: cp3-post-search-star-inquiry
    content: "Checkpoint 3 — Post (general + pet_update), Search, Star, and Inquiry domains"
    status: pending
  - id: cp4-storage
    content: "Checkpoint 4 — Signed uploads, per-user storage cap, bucket policies, client-side downscaling contract"
    status: pending
  - id: cp5-web-foundation
    content: "Checkpoint 5 — Web foundation: /pets/{id} sentinel route + CloudFront rewrite, feature conventions, markdown render, upload hook, nav"
    status: pending
  - id: cp6-web-features
    content: "Checkpoint 6 — Parallel web lanes: pet bio + QR, profile + stars, feed + composer, search, inquiry form"
    status: pending
  - id: cp7-beta
    content: "Checkpoint 7 — Private beta: Terraform apply, SSM, allowlist enabled, Playwright specs, smoke test"
    status: pending
isProject: true
---

# Fosterfolio MVP

Last updated: 2026-08-03
Status: Checkpoint 0 complete — ready for Checkpoint 1 (foundation)

---

## 1. What this is

Fosterfolio is a social platform for animal foster parents, built on the Lattice scaffold. Two surfaces carry the product: a **public pet bio page** that people reach by scanning a QR code or following a shared link, and a **public foster profile**. Animal-agnostic.

The MVP is a **publishing tool with a social veneer**, not a social network. The unit of value is the pet bio page; everything else exists to get people to it or to prove the foster behind it is real. Writes are authenticated and single-author. Reads are public and unfiltered. There is no social graph, no conversation, no notification, and no discovery beyond a chronological feed and a name search.

---

## 2. Scope boundary

### In

Auth (Lattice provides it), pet CRUD with soft delete, the public pet bio page, the public foster profile, profile editing, plain-markdown posts with one optional image, pet updates rendered inline on the bio page, an unfiltered chronological home feed, name search across pets and users, a public inquiry form that emails the foster, client-side QR generation with PNG download, and anonymous profile stars.

### Out — do not implement

Rich text editing (BlockNote), pet-update detail pages, video embeds, draft state, geo-filtering on the feed, vanity slugs, star-triggered email, shelters as a database entity, multi-image galleries, and avatar upload. Bio and post bodies are plain markdown in a textarea, rendered with `react-markdown`. Avatars are a pasted URL with an initials fallback.

### Changed from the original spec

- **`app_config` table is cut.** The storage cap reads from `STORAGE_CAP_BYTES` in the API environment, and the `/config/:key` endpoints are dropped. Building the slice costs a dozen files to read one integer that nothing can change at runtime. An admin UI is considered unlikely for this product, so treat the env var as the permanent answer rather than a placeholder — changing the cap is a redeploy, and that is fine at this scale.
- **Feed pagination is keyset, not offset.** `?page=&limit=` visibly duplicates and skips rows as posts insert at the head, and changing it later means rewriting the client too.
- **`profile_stars` gains a nullable `starrer_user_id`.** Costs nothing now, avoids an unattributable backfill when stars become an authenticated action.

---

## 3. Locked decisions

| Decision | Choice |
|---|---|
| Launch posture | Private beta — email allowlist enabled, SES stays in sandbox, rate limiting and moderation deferred |
| Home feed composition | Includes `pet_update` posts, rendered with their pet's name and photo on the card |
| API build strategy | One agent lane, resumed across checkpoints 1–4. No parallel work inside `apps/api` |
| Web build strategy | Serial foundation (checkpoint 5), then five parallel lanes (checkpoint 6) with the parent agent resolving merges |
| Page rendering | Static export for now; crawler meta injection deferred until after internal beta — see §4 |

---

## 4. Deferred: public page rendering

`apps/web/next.config.ts` sets `output: "export"`, so the app deploys as static files to S3/CloudFront with no server rendering. The pet bio page is a public, QR-scanned, link-shared URL, which means that today a shared link renders as a blank grey card in iMessage, Slack, and Twitter, and search engines index nothing.

**The chosen future fix** is a Lambda@Edge function on origin-response that injects Open Graph tags into the HTML shell for crawler user agents on `/pets/*`. CloudFront Functions cannot modify a response body, so the viewer-request tier can only rewrite URIs — body injection specifically requires Lambda@Edge.

**This is deferred until after internal beta.** Four constraints keep the door open, and all four are cheap now and expensive to retrofit:

1. **`/pets/{uuid}` must be a real path, never `/pets?id={uuid}`.** These URLs get printed onto QR codes. With `output: "export"`, the mechanism is a sentinel page at `app/pets/[id]/page.tsx` whose `generateStaticParams` returns one placeholder, plus a CloudFront Function on viewer-request that rewrites `/pets/{anything}` to that placeholder object while the browser URL stays intact. The page reads the real id from `usePathname()`. The behavior this creates is the same one Lambda@Edge later attaches to.
2. **The bio page renders from exactly one unauthenticated call.** `GET /pets/:id` returns the pet, its updates, and owner display fields in a single response. If the page assembles from three calls, edge rendering has to replicate that orchestration.
3. **That response includes a computed `meta` block** — title, description derived from `bio_markdown`, and an absolute image URL. The edge function then becomes string interpolation, the logic lives in a Jest-tested use case, and the MVP client uses the same block to set `document.title`. Photos must be absolute, publicly readable Supabase Storage URLs, since crawlers cannot authenticate.
4. **Pet lookup resolves by id-or-slug at the repository seam** even though only ids exist in MVP, so v2 vanity slugs touch neither the route nor the edge config.

Record an ADR when the injection is actually built. Until then this section is the memory.

---

## 5. Data model

All PKs are `uuid`. Timestamps are `timestamptz default now()`. Open vocabularies (`species`, `post_type`) are validated in domain entities, not by database `CHECK` constraints, so adding a value later is not a migration.

```sql
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  zip_code text,
  city text,
  state text,
  lat float,
  lng float,
  social_links jsonb,
  shelters_text text,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

create table pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
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
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references users(id) on delete cascade,
  post_type text not null default 'general',
  pet_id uuid references pets(id) on delete cascade,
  body_text text,
  image_url text,
  geo_lock text not null default 'local',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  constraint pet_update_requires_pet
    check (post_type <> 'pet_update' or pet_id is not null)
);

create table profile_stars (
  id uuid primary key default gen_random_uuid(),
  starred_user_id uuid not null references users(id) on delete cascade,
  starrer_user_id uuid references users(id) on delete cascade,  -- null for anonymous; reserved for v2
  session_token text not null,
  created_at timestamptz default now(),
  unique (starred_user_id, session_token)
);

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references users(id) on delete cascade,
  target_pet_id uuid references pets(id) on delete set null,
  sender_name text not null,
  sender_email text not null,
  message text not null,
  created_at timestamptz default now()
);
```

### Indexes

```sql
create index on pets (owner_id) where deleted_at is null;
create index on posts (author_id) where deleted_at is null;
create index on posts (pet_id) where deleted_at is null;
create index on posts (created_at desc, id desc) where deleted_at is null;  -- keyset feed
create index on profile_stars (starred_user_id);

alter table pets add column search_vector tsvector
  generated always as (to_tsvector('english', coalesce(name, ''))) stored;
create index on pets using gin (search_vector);

alter table users add column search_vector tsvector
  generated always as (to_tsvector('english', coalesce(display_name, ''))) stored;
create index on users using gin (search_vector);
```

### Triggers and functions

A row in `public.users` must exist for every account, so it is created by trigger rather than by any API path that could be missed:

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

`updated_at` is maintained by a shared `touch_updated_at()` trigger on `pets` and `posts`.

The storage cap needs a sum over `storage.objects`, which PostgREST does not expose. A `security definer` function in `public` makes it reachable via RPC:

```sql
create or replace function public.user_storage_bytes(p_user_id uuid)
returns bigint language sql security definer set search_path = public, storage as $$
  select coalesce(sum((metadata->>'size')::bigint), 0)
  from storage.objects
  where bucket_id = 'fosterfolio-media'
    and (storage.foldername(name))[1] = p_user_id::text;
$$;

revoke all on function public.user_storage_bytes(uuid) from public;
grant execute on function public.user_storage_bytes(uuid) to service_role;
```

The media bucket is created in a migration so it is reproducible:

```sql
insert into storage.buckets (id, name, public)
values ('fosterfolio-media', 'fosterfolio-media', true)
on conflict (id) do nothing;
```

### RLS is not the control

`SupabaseAdapter` authenticates every call with `SUPABASE_SERVICE_ROLE_KEY`, which **bypasses RLS**. Every policy written for `users`, `pets`, `posts`, `inquiries`, and `profile_stars` is inert for API traffic. Ownership is enforced in the use cases — uniformly, and as a reviewable checklist item, because one agent forgetting `owner_id === req.user.id` is a hole where anyone can edit anyone's pet.

Write the policies anyway as defense in depth, and note that storage policies on `storage.objects` are the one place they matter today, since uploads go from the browser directly to Supabase Storage.

---

## 6. API surface

Public means no `Authorization` header. Authenticated routes carry `Bearer <jwt>`, validated by the existing Supabase middleware.

```
GET    /users/:id              public   profile projection + star_count
PUT    /users/:id              auth     own id only
GET    /users/:id/pets         public   excludes soft-deleted
GET    /users/:id/posts        public   excludes pet_updates

POST   /pets                   auth
GET    /pets/:id               public   includes nested updates + computed meta block
PUT    /pets/:id               auth     own pet
DELETE /pets/:id               auth     own pet, soft delete
GET    /pets/:id/updates       public

POST   /posts                  auth     general | pet_update
GET    /posts                  public   feed, keyset: ?cursor=<created_at>,<id>&limit=20
GET    /posts/:id              public
PUT    /posts/:id              auth     own post
DELETE /posts/:id              auth     own post, soft delete

POST   /users/:id/star         public   body: { session_token }
GET    /users/:id/star-count   public

POST   /inquiries              public   persists, then sends email
GET    /search?q=              public   { pets: [...], users: [...] }

POST   /storage/sign           auth     ?filename=&contentType= → { uploadUrl, publicUrl }
```

Lattice mounts auth at the router prefix. Fosterfolio needs public reads and authenticated writes on the same path, so checkpoint 1 moves auth to per-route middleware and adds an `optionalAuth` variant.

---

## 7. Checkpoints

### Checkpoint 0 — Supabase tooling ✅

Root `supabase/` layout with `config.toml` and timestamped migrations, `npm run supabase:*`, project linked, allowlist `platform_` migration applied, env files populated. MCP config is in `.cursor/mcp.json` (needs `SUPABASE_PROJECT_REF` + `SUPABASE_ACCESS_TOKEN` in the Cursor/shell env). Harvest bundle name: `supabase-cli-migrations`.

### Checkpoint 1 — Foundation

One agent, no parallelism. Nothing here changes behavior; everything here is what the next three checkpoints stand on.

- All migrations from §5, applied via the checkpoint 0 tooling.
- Per-route `requireAuth` and `optionalAuth` middleware. The existing protected stack is retained so the allowlist still gates beta signups.
- Errors restructured: each domain owns an error module, and `ResultError` carries its own HTTP status, retiring the central map in `utils/httpErrorMapper.ts`.
- `Container` split into per-domain registration modules; routes moved to a registry. The container's own notes call for this past ~8 getters, and this build lands near 30.
- `DataAdapter` extended for exact counts (`Prefer: count=exact` plus the `Content-Range` response header, which the adapter currently discards), RPC calls, and insert-returning.
- The public-vs-owner DTO convention, with one worked example. `Thing.toPrimitives()` serializes the whole entity; `users` holds `email`, `zip_code`, `lat`, and `lng` behind a public endpoint, so entity-wide serialization is a leak by default.

**Exit:** `npm run ci` green. The `Things` slice untouched and still passing.

### Checkpoint 2 — User and Pet

Both domains end to end, following the `Things` slice shape. Ownership enforced in use cases. Soft delete on pets. The zip → city/state lookup lives behind an adapter in `infrastructure/adapters/` per repo convention and fails soft, since a bad zip must not block a profile save. `GET /users/:id/pets`. The computed `meta` block on `GET /pets/:id` (§4).

**Exit:** supertest coverage including 403s on cross-owner writes, and a test asserting no private user field is reachable through a public endpoint. Delete the `Things` vertical slice once Pet has replaced it as the reference.

### Checkpoint 3 — Post, Search, Star, Inquiry

Unified `posts` with `post_type`, keyset feed pagination, and pet name and photo denormalized onto `pet_update` feed cards. Full-text search across both `search_vector` columns. Stars with `session_token` dedup plus the reserved `starrer_user_id`. Inquiries persisted, then emailed through an `EmailAdapter` port — a logging implementation for beta, SES behind an env switch. Set `Reply-To: sender_email` rather than instructing the recipient to copy an address out of the body.

**Exit:** complete Swagger, every endpoint under test.

### Checkpoint 4 — Storage

The signing endpoint, cap enforcement via `user_storage_bytes`, bucket policies, and a documented client contract for downscaling before upload. A phone photo is 3–5MB, so an un-resized client hits a 50MB cap in about a dozen uploads. Uploaded filenames get a random suffix so a second `photo.jpg` cannot silently overwrite the first or make another user's media enumerable.

**Exit:** cap exceeded returns a structured error the client can render as "You've used up your storage. Remove a photo to upload more."

### Checkpoint 5 — Web foundation

One agent. The `/pets/[id]` sentinel route and the CloudFront rewrite in Terraform (§4), feature-folder conventions extended from `client/features/things`, markdown rendering, the upload hook, navigation and layout. Everything in checkpoint 6 depends on these seams, so this is the last serial piece.

### Checkpoint 6 — Web features, parallel

Five lanes, separate directories, parent agent resolves merges: pet bio page and QR; foster profile with stars and profile editing; feed with composer; search; inquiry form. The pet bio page gets the closest review — it is the product.

### Checkpoint 7 — Private beta

Terraform apply, SSM wiring, allowlist enabled with tester emails via `select public.set_allowlist_enabled(true)` plus `EMAIL_ALLOWLIST_ENABLED=true`, Playwright specs, smoke test.

---

## 8. Rules for every agent on this plan

- Mirror the `Things` vertical slice: entity → use case → repository interface → Supabase repository → controller → route → `Container` registration.
- Every write use case that touches an owned row checks ownership against `req.user.id`. RLS will not do it for you (§5).
- Two DTO projections per entity, public and owner. Never return an entity's full serialization from a public endpoint.
- Errors go through the domain error module and `Result`. No raw `res.status(500)`.
- Tests ship with the feature, per the repo's test-expert rule. API tests in `test/api/` with supertest and `createTestApp()`; web in `test/web/`.
- Use the `@api/*` and `@client/*` aliases. No relative `../` imports across layers.
- Ids are `uuid` generated by the database. The `Thing` pattern of generating an id in the application does not carry over; repositories use insert-returning.

---

## 9. Post-MVP

The original spec's post-MVP list is mostly content richness. The likelier pressure after launch, in rough order:

1. **The social layer** — follows, comments, post likes, a notification inbox. MVP has no way to respond to anything; the anonymous star is the only feedback primitive. The unified `posts` table makes comments a `parent_post_id` away.
2. **Inquiries become an inbox** — status and threading, with email demoted to a notification. A foster with a popular dog currently has no way to see what they have answered.
3. **Discovery** — a browsable `/pets` directory with species and status filters, PostGIS distance filtering on the feed, and `geo_lock` finally doing something. Search-by-name only works when you already know who to look for.
4. **Sharing that converts** — vanity slugs, per-pet generated OG images, sitemap. Entirely gated on §4.
5. **Shelters as entities** — `shelters_text` will hold "NYCACC", "nycacc", and "NYC ACC" within a month, which is its own forcing function.
6. **Trust and ops** — reporting and moderation once strangers can comment. Expect these to run through the Supabase dashboard and direct SQL for a long time.

**Note on admin (not a plan, just context):** an admin mode may eventually exist, but it will be small — a handful of simple operations, and possibly a standalone client/server outside this monorepo rather than a surface inside it. Nothing in this build should be shaped to anticipate it, and no one should design an enterprise admin suite. The only thing worth doing is keeping moderation-style actions expressible as plain column updates (a `hidden_at` timestamp, say) rather than multi-step workflows, so dashboard SQL, a small admin page, or a separate tool all work without a redesign.

Content richness — rich text, galleries, video, drafts — is v2.5. It makes existing users happier without changing what the product is.

---

## 10. Open items

- Confirm the Supabase project exists and its credentials are in SSM (checkpoint 0).
- Decide the admin UID; hardcode as an env var for MVP.
- SES domain verification and production-access request. Not blocking — beta stays in the sandbox — but the request takes days, so file it before checkpoint 7.
- Spam protection on the two unauthenticated write endpoints (`POST /inquiries`, `POST /users/:id/star`) is deliberately deferred with private beta. Per-IP limiting does not work in Lambda memory; the eventual answer is API Gateway throttling plus a honeypot field.
