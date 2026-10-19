# Fosterfolio v2 — Design Spec

## TL;DR

v2 adds two systems on top of the live v1 app.

**Marketing analytics for foster parents.** Foster parents create multiple tracked links and QR codes per pet. Each link is tagged with a channel, either from a preset list (lawn sign, Instagram, flyer, etc.) or a custom channel they define. A per-pet analytics page shows which channels drive views and, more importantly, inquiries. A separate links page manages the tracked links, and owners see a small analytics widget on their own pet bio page. Tracking runs through PostHog in cookieless mode with no PII from signed-out visitors. Data is rolled up into Supabase on a schedule, and simple in-app charts render from that rollup. When an inquiry arrives with no known source, the success screen asks "How did you hear about [Pet]?" Capture stops when a pet is marked Adopted.

**Inquiry inbox and notifications.** A one-way inbox where foster parents receive and review inquiries. The only notification type in v2 is "inquiry received." Each one appears in the inbox and is also emailed.

Both systems are built as provider-agnostic workspace packages (`packages/analytics`, `packages/notifications`) so they can be lifted into Lattice afterward.

**Maybes (not in v2 unless promoted):** notification digest every N days, auto-generated adoption report.

**Rough effort (AI-assisted):** 2 focused sessions. Analytics plus the rollup job is the riskiest piece. The links manager and inbox are straightforward CRUD on established Lattice patterns.

---

## Scope

### In v2
- Tracked links with per-link QR codes, managed on a dedicated page per pet
- Preset channels plus user-defined custom channels
- First-touch source attribution: link code, then referrer, then direct
- PostHog event capture on pet pages (cookieless, IP discarded, GeoIP city kept)
- Funnel per pet and per channel: view, then inquiry form opened, then inquiry submitted
- Scheduled rollup from PostHog into Supabase; in-app charts read from the rollup only
- Per-pet analytics page, plus an owner-only analytics widget on the pet bio page
- Inquiry form additions: optional zip, attached source, self-reported source fallback, Cloudflare Turnstile
- Analytics capture stops on Adopted; analytics page freezes read-only
- Notifications table, dispatcher, inquiry inbox, unread badge
- Email for every inquiry notification via SES, with one email on/off setting
- `packages/analytics` and `packages/notifications` as app-agnostic workspace packages

### Maybe (pending feedback)
- Notification digest every N days (schema supports it via `emailed_at`; no job built)
- Auto-generated adoption report when a pet is marked Adopted

### Explicitly out of v2
- Any notification type other than `inquiry_received`. No notifications for profile stars, follows, or posts.
- Social proof and social features: public view counts, likes, follows, notifications for updates. Candidates for v3 only if feedback shows a need.
- Cross-pet analytics overview or dashboard card
- Two-way messaging. The inbox is one-way; replies happen in the foster parent's email client via mailto.
- Ad-blocker reverse proxy (documented follow-up, see below)
- Realtime notifications (unread count is polled)
- Session replay, heatmaps, and any PostHog feature beyond event capture and query

---

## Analytics

### Principles
The goal is to answer "what's working to get this pet adopted," not "how much traffic do I have." Most pets get dozens of views, not thousands, so the design targets small numbers: totals and channel comparisons first, time series second.

Inquiry counts come from Supabase, which is authoritative. PostHog undercounts behind ad blockers, so it is used only for views and form opens.

### Tracked links
URL format is `/pets/[id]?s=<code>`. The `code` is a short random URL-safe string of 6–8 characters. This works with the static S3 export and needs no redirect hop.

Each link has a **channel** (what it's grouped by) and an optional **label** (a readable note for the owner, e.g. "front yard" vs "corner of 5th").

**Channels:**
- The API is the single source of truth for channels. The frontend never hardcodes channel options; the picker always renders whatever `GET /me/channels` returns.
- Presets: Lawn sign, Instagram, Facebook, TikTok, Flyer, Shelter listing, Other. These are a hardcoded list in the API code, updated by editing code when needed.
- Custom: the owner can type a new channel name ("Vet office", "Dog park bulletin"). It's saved and reused in their channel picker from then on.
- Storage: every link stores `channel_key` and `channel_name`. Presets use fixed keys (`lawn_sign`, `instagram`, ...). A custom channel's key is its name, slugified: lowercased, trimmed, spaces to hyphens. That way "Vet Office" and "vet office" group together.
- The backend groups by `channel_key`, and the UI displays `channel_name`.
- Custom channels are scoped per owner. No separate table is needed: the picker reads distinct non-preset `channel_key`/`channel_name` pairs from `tracked_links where owner_id = auth.uid()`, including archived links so a channel doesn't vanish when its last link is archived. RLS on `tracked_links` enforces the same scope at the database layer. Users never see each other's custom channels.
- Identical custom names from different users share a `channel_key`. That's harmless (nobody sees anyone else's data) and enables cross-app aggregate stats later.
- Known limitation: a custom channel exists only through the links that use it, so it can't be renamed globally or kept in the picker while unused. If that becomes a need, promote it to a `custom_channels` table keyed by `(owner_id, channel_key)` as an additive migration.

**Rules:**
- Links are archived, never deleted. Printed QR codes live forever and must keep attributing.
- Archived links still resolve to the pet page and still attribute.
- Renaming a label or changing a channel relabels that link's history retroactively. That's expected.
- Links on an Adopted pet still resolve. Capture is off, so those scans aren't recorded.

### Source attribution (first-touch)
On a visitor's first landing in a browser session, resolve the source in this order and store it in `sessionStorage` under the key `ff_source`:

1. A `?s=` code matching a tracked link → that link's id and channel
2. A referrer domain mapped to a channel: instagram.com → Instagram, facebook.com or l.facebook.com → Facebook, google.* → Search, and so on
3. Otherwise → `direct`, displayed as "Direct / original QR." This label exists because v1 lawn signs point to untagged URLs and will always land here.

The stored source is attached to every PostHog event and to inquiry submissions. It survives the visitor browsing the foster parent's profile and coming back to the pet. First-touch wins: the value is never overwritten within the session.

### Events (pet pages only)
| Event | Properties |
|---|---|
| `pet_viewed` | `pet_id`, `owner_id`, `link_id` (nullable), `channel_key`, `referrer_domain` |
| `inquiry_form_opened` | same |
| `inquiry_submitted` | same |

PostHog adds GeoIP city and region at ingestion. Confirm in PostHog project settings that GeoIP enrichment still runs with "Discard client IP data" enabled.

Capture is skipped entirely when the viewer is the authenticated owner of the pet, or when the pet's status is Adopted.

### PostHog configuration
- `persistence: 'memory'`, which makes it cookieless with no persistent identifiers
- Discard client IP data: on
- Autocapture: off. Only explicit events are sent, which keeps volume well inside the 1M/month free tier.
- Add a code comment at init and a README note in `packages/analytics`: *Ad blockers block PostHog for a meaningful share of visitors. Follow-up: proxy ingestion through a CloudFront path on our own domain.*

Unique visitors are approximate because there are no cookies. Label them "approx. visitors" in the UI.

### Rollup job
A scheduled Lambda, triggered hourly by EventBridge, runs one HogQL query grouped by `pet_id`, `link_id`, `channel_key`, `city`, and day. It upserts the results into `analytics_daily`. A single grouped query per run stays well inside PostHog's query API rate limits.

Dashboards never call PostHog directly. Inquiry counts are joined from the `inquiries` table at read time.

### Adopted cutoff
When a pet's status changes to Adopted, set `pets.analytics_stopped_at`. The client checks the status and skips capture, and the rollup job keeps the final numbers. The analytics page and the owner widget show a frozen "final results" state.

If the status is reverted, clear `analytics_stopped_at` and capture resumes. "Previously Fostered — Adoption Status Unknown" keeps capturing, because that page is still helping the pet get found.

Data is retained for the life of the pet.

---

## Inquiry Form Changes
- **Optional zip code field.** Stored on the inquiry in Supabase only, never sent to PostHog, because it sits next to an email address.
- **Hidden source fields.** These carry the stored `ff_source` values (`link_id`, `channel_key`).
- **Cloudflare Turnstile.** Free spam protection, which also prevents inbox and email spam.
- **Self-reported source on the success screen.** Shown only when the source is `direct`: a one-tap "How did you hear about [Pet]?" with options Lawn sign, Instagram, Facebook, Friend or family, Shelter, Search, and Other. The answer is saved to the inquiry as `self_reported_source`. Visitors can skip it.

---

## Inbox & Notifications

### Model
Notifications are generic rows: a recipient, a type string, a JSONB payload, an entity reference, read and archive state, and `emailed_at`. v2 registers exactly one type, `inquiry_received`. The generic shape exists for the Lattice package, not because more types are planned.

The dispatcher writes the in-app row, checks the recipient's email preference, and sends the email if it's enabled.

### Behavior
- The inbox lists inquiries only.
- Inquiry detail shows sender name, email, zip (if given), message, the pet, and the source. A "Reply by email" mailto button handles replies.
- Inbox states are read/unread and archived. Nothing else.
- The unread count is polled on page focus and route change. Websockets aren't an option because Lambda can't hold them.
- The settings page has a single toggle, "Email me when I receive an inquiry," defaulting to on. In-app inbox delivery is always on.
- The email footer links to that settings page. Inquiry emails are transactional, so a full unsubscribe-token flow is deferred until a non-transactional type exists. Document this in the notifications package README.

---

## Data Model Additions

```sql
create table tracked_links (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  owner_id uuid not null references users(id) on delete cascade,
  code text unique not null,          -- short URL-safe code used in ?s=
  channel_key text not null,          -- preset key or slugified custom name; group by this
  channel_name text not null,         -- display name, e.g. "Lawn sign", "Vet office"
  label text,                         -- optional owner note, e.g. "front yard"
  archived_at timestamptz,
  created_at timestamptz default now()
);
create index on tracked_links (pet_id);
create index on tracked_links (owner_id, channel_key);

alter table pets add column analytics_stopped_at timestamptz;

alter table inquiries
  add column zip_code text,
  add column source_link_id uuid references tracked_links(id) on delete set null,
  add column source_channel_key text,  -- resolved channel incl. 'direct'
  add column self_reported_source text;

create table analytics_daily (
  pet_id uuid not null references pets(id) on delete cascade,
  link_id uuid references tracked_links(id) on delete set null,
  channel_key text not null,
  city text,
  day date not null,
  views int not null default 0,
  approx_visitors int not null default 0,
  form_opens int not null default 0,
  updated_at timestamptz default now()
);
-- link_id and city are nullable, so a plain primary key won't work; use a unique index with coalesce
create unique index analytics_daily_uniq on analytics_daily
  (pet_id, coalesce(link_id, '00000000-0000-0000-0000-000000000000'::uuid), channel_key, coalesce(city, ''), day);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references users(id) on delete cascade,
  type text not null,                 -- v2: 'inquiry_received' only
  payload jsonb not null default '{}',
  entity_type text,                   -- 'inquiry'
  entity_id uuid,
  read_at timestamptz,
  archived_at timestamptz,
  emailed_at timestamptz,             -- also enables a future digest job
  created_at timestamptz default now()
);
create index on notifications (recipient_id, created_at desc);
create index on notifications (recipient_id) where read_at is null;

create table notification_preferences (
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  email_enabled boolean not null default true,
  primary key (user_id, type)
);
-- No row = registered default for that type (email on).
```

**RLS:** Owners read their own `tracked_links`, `analytics_daily` (via pet ownership), `notifications`, and `notification_preferences`. The rollup job and the dispatcher write with the service role.

---

## API Additions

```
POST   /pets/:id/links                 create tracked link (auth, owner)
GET    /pets/:id/links                 list links incl. archived, with per-link totals (auth, owner)
PATCH  /links/:id                      edit label / channel, archive / unarchive (auth, owner)
GET    /me/channels                    all channels for the picker: hardcoded presets + owner's custom channels (auth)
GET    /links/resolve/:code            public; returns { linkId, channelKey, petId } for client attribution

GET    /pets/:id/analytics?range=      per-pet funnel, by channel, by link, by city, time series (auth, owner)
GET    /pets/:id/analytics/summary     compact numbers for the owner widget (auth, owner)

GET    /me/notifications?status=       inbox list (unread|all|archived), paginated (auth)
GET    /me/notifications/unread-count  (auth)
PATCH  /me/notifications/:id           mark read / archive (auth)
GET    /me/notification-preferences    (auth)
PUT    /me/notification-preferences    (auth)
```

**`GET /me/channels`** returns `[{ key, name, isPreset }]`. The hardcoded presets come first, followed by the owner's distinct non-preset channels from `tracked_links` (archived links included). A user with no custom channels gets the presets only. It never errors and never returns an empty list. The preset list lives only in the API, and the same constant drives the "non-preset" filter, so the two can't drift.

**Changes to `POST /inquiries`:** It now accepts `zip_code`, `source_link_id`, `source_channel_key`, and a Turnstile token. It triggers `inquiry_received` through the dispatcher instead of sending the email directly, and it returns a short-lived token for the follow-up endpoint below.

**`PATCH /inquiries/:id/self-reported-source`** is public and keyed by that token. It allows one write, within a short window after the inquiry is created.

---

## UI Surfaces

**Links & QR manager — `/pets/[id]/links`.** This is the most UX-heavy new page. It lists links grouped by channel. Each row shows the channel name, label, views, inquiries, and a QR preview, along with "Download QR" (PNG), "Copy link," and an archive toggle.

The "Create link" flow has a channel picker: preset icon buttons, the owner's saved custom channels, and an "+ Add custom channel" text input. It also takes an optional label.

Archived links collapse into a section at the bottom. The original v1 untagged URL appears as a non-editable "Original QR" row, so foster parents understand where Direct traffic comes from.

**Per-pet analytics — `/pets/[id]/analytics`.** Top to bottom:
1. Three stat cards: views, inquiries, conversion rate
2. A channel comparison bar chart of views vs inquiries per channel
3. A per-link table
4. A top cities list
5. A views-over-time line chart, de-emphasized, defaulting to weekly buckets when data is sparse

Empty state: "Create your first tracked link to see which channels work best," linking to the links page. Adopted state: a frozen banner, "Final results — [Pet] was adopted 🎉," with all data read-only.

**Owner widget on the pet bio page.** Visible only to the authenticated owner. A compact card shows views and inquiries for the last 7 days and the top channel, with links to "View analytics" and "Manage links." It replaces the v1 single-QR panel; the default QR download moves to the links page as the "Original QR" row.

**Inbox — `/inbox`.** A list of inquiries with unread emphasis and Unread / All / Archived filters. Inquiry detail shows the full message, a pet chip, a source chip ("via Lawn sign — front yard" or the self-reported answer), city from zip if given, and a "Reply by email" button.

**Nav.** An inbox icon with an unread badge in both the mobile tab bar and the desktop nav.

**Notification settings — `/settings/notifications`.** A single toggle: "Email me when I receive an inquiry."

**Inquiry form and success screen.** Add the optional zip field and an invisible Turnstile widget. The self-reported source prompt appears on the success screen only when the source is `direct`.

---

## Package Boundaries (for later Lattice extraction)

**`packages/analytics`** knows nothing about pets.
- Client: provider-agnostic `track(event, props)` and `init(config)`, plus an owner/opt-out suppression hook
- Attribution utility: first-touch resolution with a configurable param name (`s`), storage key, and referrer-to-channel map
- Server: an `AnalyticsProvider` interface (`queryAggregates`), with `PostHogProvider` as the first adapter
- A rollup runner that takes an app-supplied query definition and an upsert function
- A README containing the ad-blocker follow-up note

**`packages/notifications`** knows nothing about inquiries.
- Domain: the `Notification` entity and a type registry, `registerType({ type, emailTemplate, defaultEmailEnabled })`
- Application: `dispatch(recipientId, type, payload, entityRef)` and the preference check
- Channels: `InAppChannel` (a repository interface) and an `EmailChannel` interface with an SES adapter
- A README noting that unsubscribe tokens are a follow-up, needed once a non-transactional type exists
- Follows Lattice DDD layering; the app wires repositories and adapters in `Container`

The Fosterfolio app supplies the event names, channel presets, the HogQL query, the `inquiry_received` type, and its email template.

---

## Edge Cases Handled
- **v1 printed signs:** untagged, so they show as "Direct / original QR"
- **Owner self-views:** excluded from capture
- **Link preview bots** (iMessage, Slack, Facebook): mostly don't run JS, so they don't register; residual noise is accepted
- **Sparse data:** weekly buckets, and stat cards lead the page
- **Custom channel duplicates:** slugified key groups "Vet Office" and "vet office" together
- **Inquiry spam:** blocked by Turnstile before it reaches the inbox
- **Archived links:** still attribute
- **Adopted, then reverted:** clears the stop flag, and capture resumes
- **Soft-deleted pet:** analytics and links are hidden in the UI but the data is retained, consistent with v1 soft-delete
- **Approximate unique visitors:** labeled as such
- **Inquiry for a soft-deleted pet:** stays in the inbox; the pet chip shows "No longer available"

## Documented Follow-ups
- Ad-blocker undercount → CloudFront reverse proxy for PostHog ingestion
- Unsubscribe tokens → required once any non-transactional notification type exists
- Notification digest job (schema is ready)
- Adoption report
- v3 candidates, only if feedback shows a need: public social proof, likes, follows, notifications for social activity

---

## Open Questions
None. The spec is ready for agent implementation planning.
