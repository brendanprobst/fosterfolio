---
name: v2 slice 5a — UX polish, bugs, and low-hanging fruit
overview: Facelift the v2 owner surfaces (inbox, pet analytics, owner pet bio, guest pet bio, /profile) and fix the bugs found in the 2026-10-09 stress test. Everything here ships on the current tracked-links model. The foster-me links rework is a separate plan (v2_slice5b_foster_me_links.plan.md) and must land AFTER this one, because it reuses the chart primitives, the QR download menu, and the owner layout shell built here.
status: pending
todos:
  - id: 5a-todo-md
    content: "Add §7 'v2 slice 5a' to docs/plans/todo.md linking this plan; tick items as they land"
    status: completed
  - id: 5a-charts
    content: "Shared chart primitives: shadcn `chart` (Recharts) + views/inquiries color tokens"
    status: completed
  - id: 5a-inbox
    content: "Inbox facelift + 4 bugs; generic, harvest-ready inbox UI under client/components/inbox/"
    status: pending
  - id: 5a-analytics-page
    content: "Pet analytics page: real charts, prefetch all 3 ranges, analytics skeleton, color; add inquiriesByDay to the DTO"
    status: completed
  - id: 5a-owner-widget
    content: "Owner analytics widget: stat tiles + sparklines + week-over-week delta, reads the cached analytics query"
    status: pending
  - id: 5a-owner-shell
    content: "OwnerPageLayout shell (admin hero + 'Public preview' section); owner pet bio uses it; remove OwnerOnlyLabel from bio"
    status: pending
  - id: 5a-guest-bio
    content: "Guest pet bio: single column, facts below bio, floating inquiry CTA opening a Sheet"
    status: pending
  - id: 5a-profile
    content: "/profile uses OwnerPageLayout: Add pet in hero, active fosters above the fold, everything else below"
    status: pending
  - id: 5a-presets
    content: "Remove 'Other' and 'Shelter listing' from the preset list (no guard; existing rows deleted manually)"
    status: completed
  - id: 5a-qr-sizes
    content: "QrDownloadMenu: Web / A4 flyer / Large print (SVG); delete the 'settings will land here later' placeholder"
    status: completed
---

# v2 slice 5a — UX polish, bugs, and low-hanging fruit

## Context

Fosterfolio v2 (tracked links, analytics rollup, inquiry inbox) is functionally complete — see [the v2 spec](fosterfolio-v2-spec.md). A stress test on 2026-10-09 found the new owner surfaces confusing, unstyled, and in a few places broken. This slice is UI-first and mostly frontend; the only backend changes are a small DTO addition and the preset cleanup.

**Out of scope here (slice 5b):** foster-me tracked links, the `/profile/links` page, the create-link modal and first-link tutorial, the always-visible custom channel input, owner-level analytics. Do not start those; 5b depends on this slice.

**Estimate (AI-assisted):** ~1.5 focused sessions. Inbox and the bio/profile layouts are the bulk; presets and QR sizes are under an hour each.

### Execution order

1. `5a-todo-md` → 2. `5a-presets` → 3. `5a-qr-sizes` → 4. `5a-charts` → 5. `5a-analytics-page` → 6. `5a-owner-widget` → 7. `5a-inbox` → 8. `5a-owner-shell` → 9. `5a-guest-bio` → 10. `5a-profile`

Small independent wins first, then shared primitives, then the surfaces that consume them. `5a-owner-shell` must come after the widget (the widget lives in the shell's hero) and before `5a-profile` (which reuses the shell).

### Ground rules for every ticket

- Tests alongside the change (Vitest + RTL for web, Jest for API). Run `npm run ci` before calling a ticket done.
- Use existing primitives first: `components/ui` already has `dialog`, `sheet`, `dropdown-menu`, `card`, `badge`, `tooltip`. Chart color tokens `--chart-1..5` already exist in `client/styles/globals.css` — use them, never hard-code hex in components.
- Check light and dark (the `.dark` palette exists) and a ~375px viewport for every surface touched.
- Update `docs/plans/todo.md` §7 as each ticket lands.

---

## 5a-todo-md — Wire this plan into todo.md

**Description.** `todo.md` still describes the road to private beta and has no record of v2 slices. Add a section so the next agent knows where to look.

**Acceptance criteria.**
- New `## 7. v2 slice 5a — UX polish` section in `docs/plans/todo.md` with one line per ticket below, linking this file.
- §5's done note about `OwnerOnlyLabel` gets a follow-up line: "Superseded by 5a-owner-shell — owner/public split is now structural, labels removed from pet bio and /profile."
- §4's "foster-me and pet bio should not be the same page" item gets a pointer: "Addressed by slice 5b (foster-me preview page)."

**Agent.** Main session.

**Prompt.**
> Read `docs/plans/v2_slice5a_ux_polish.plan.md` and `docs/plans/todo.md`. Add a §7 section to todo.md listing every 5a ticket as an unchecked line linking the plan, and add the two cross-reference notes described in the 5a-todo-md ticket. Don't change any other todo.md content.

---

## 5a-presets — Remove "Other" and "Shelter listing"

**Description.** Remove `shelter_listing` and `other` from `CHANNEL_PRESETS` in `apps/api/domain/channels/channelPresets.ts`. No guard or retired-key list: existing links using those keys will be deleted manually by the operator, and if a user later types "Shelter listing" as a custom channel, that's fine — it becomes an ordinary custom channel.

**Acceptance criteria.**
- `GET /me/channels` presets are exactly: Lawn sign, Instagram, Facebook, TikTok, Flyer.
- No other code changes; existing tests updated to the new preset list.

**Agent.** ddd-expert + test-expert.

**Prompt.**
> Remove the `shelter_listing` and `other` entries from `CHANNEL_PRESETS` in `apps/api/domain/channels/channelPresets.ts`. Don't add any guard for existing links that use those keys. Update any tests or fixtures that assert the old preset list, and run `npm run ci`.

---

## 5a-qr-sizes — QR download sizes

**Description.** QR downloads are a fixed PNG (`ShareQrDownload.tsx`, `width: 320`), and `ShareQrDialog.tsx` shows a placeholder ("Size, color, and other print settings will land here later") that renders behind a half-transparent overlay in the stress-test recording. Replace both with one generic `QrDownloadMenu` built on `dropdown-menu`. Keep it app-agnostic (takes `url` and `filenameBase`) so it can be harvested into Lattice.

**Acceptance criteria.**
- Menu options:
  - **For sharing on the web** — PNG, 512px
  - **For an A4 flyer** — PNG, 1240px (≈10.5 cm at 300 dpi)
  - **For large prints** — SVG (`qrcode.toString(url, { type: 'svg' })`), scales to any size
- Filenames like `{filenameBase}-web.png`, `-a4.png`, `-print.svg`.
- `ShareQrDialog`'s placeholder copy is gone; every existing QR download entry point uses the menu.
- Error-correction level `M` or higher on all sizes, so a printed sign survives some dirt.
- Vitest: each option calls `qrcode` with the right width/type; the filename is right.

**Agent.** Main session (web) + test-expert.

**Prompt.**
> Create `apps/web/client/components/QrDownloadMenu.tsx`: a generic `dropdown-menu` with three items (web 512px PNG, A4 1240px PNG, large-print SVG) that generates with the already-installed `qrcode` package and downloads `{filenameBase}-web.png` / `-a4.png` / `-print.svg`. Props: `url`, `filenameBase`, optional trigger label. No Fosterfolio imports. Replace `ShareQrDownload` usage and the placeholder text in `ShareQrDialog`, and use the menu in `LinksManager` rows. Add Vitest coverage, mocking `qrcode`.

---

## 5a-charts — Shared chart primitives

**Description.** There's no chart library; the analytics "graph" is a hand-drawn SVG line with no axes, and channel bars are raw black divs. Add shadcn's `chart` component (Recharts underneath) and define the two semantic series colors the whole slice uses.

**Acceptance criteria.**
- `npx shadcn@latest add chart` run; `recharts` in `apps/web/package.json`.
- Two semantic series, defined once in a small `chartConfig` module: **views** → `--chart-1`, **inquiries** → `--chart-2`. Check the pair reads clearly in both light and dark.
- A tiny `Sparkline` component (no axes, no tooltip, fixed height) for the owner widget.
- Static export build still passes (Recharts is client-only; components are `"use client"`).

**Agent.** Main session (web).

**Prompt.**
> Add shadcn's `chart` component to `apps/web` and create `client/components/charts/` with a `chartConfig.ts` exporting `views` (var(--chart-1)) and `inquiries` (var(--chart-2)) series configs, plus a minimal `Sparkline` (Recharts `LineChart`, no axes/grid/tooltip, ~40px tall, accepts `points: {x: string; y: number}[]` and a series key). Verify both modes on the `/ui` gallery page by adding a sparkline and a small bar chart there. Confirm `npm run build` (static export) passes.

---

## 5a-analytics-page — Pet analytics page

**Description.** `PetAnalyticsPage.tsx` refetches on every range toggle and shows a full-page skeleton each time, using the pet bio skeleton (`DataPageSkeleton variant="pet"`). The time series is a hand-drawn SVG; everything is monochrome. Fix all of it.

Note on a suspected bug: during planning, the Links table looked like it ignored the range (150 vs 370 views). Code inspection shows `byLink` *is* built from the ranged rows in `buildPetAnalytics`, so the frames were most likely captured mid-switch. Verify with one API test; fix only if it reproduces.

**Acceptance criteria.**
- All three ranges (`7d`, `30d`, `all`) are fetched in parallel with `useQueries` on first load; one skeleton shows until all three resolve; toggling a range never shows a skeleton or refetches.
- Same query keys as before (`["pet-analytics", petId, range]`), so other surfaces can reuse the cache.
- New `DataPageSkeleton` variant `analytics`: three stat tiles, a chart block, a table block.
- Channel comparison is a horizontal grouped bar chart (views vs inquiries) using `chartConfig`, with readable labels (the current labels render at heading size).
- Views over time is a real line/area chart with axes and tooltip, with inquiries as a second series. Keep the existing week-bucketing for sparse data.
- Backend: `PetAnalyticsDto` gains `inquiriesByDay: {day, inquiries}[]`, built from the same ranged inquiry rows. Jest test.
- Color: stat tiles get a subtle tinted accent per series; top-cities becomes a simple ranked bar list.
- Adopted pets still show the frozen "final results" banner.

**Agent.** Main session (web) + ddd-expert (DTO) + test-expert.

**Prompt.**
> Rework `apps/web/client/pages/pets/PetAnalyticsPage.tsx` and `AnalyticsView.tsx`. Fetch all three ranges in parallel with `useQueries` (keys `["pet-analytics", petId, range]`), gate a single skeleton on all three, and make range toggles pure client state. Add an `analytics` variant to `DataPageSkeleton`. Replace `ChannelBars` and `ViewsLine` with shadcn chart components using `client/components/charts/chartConfig.ts`. In the API, add `inquiriesByDay` to `PetAnalyticsDto` in `application/analytics/petAnalytics.ts` (group the ranged inquiry rows by UTC day) with a Jest test, and plot it as the second series. Also add one Jest test proving `byLink` respects the range; fix only if it fails. Update existing analytics tests.

---

## 5a-owner-widget — Owner analytics widget

**Description.** `OwnerAnalyticsWidget.tsx` is a small text card with underlined links. It moves into the owner hero (next ticket) and gets much more room. Goal: make the foster parent feel good, with trends as illustration rather than a report.

**Acceptance criteria.**
- Three tiles: **Views** (7d total + sparkline), **Inquiries** (7d total + sparkline), **Top channel** (name + share of views).
- Week-over-week delta on views and inquiries ("↑ 12% vs last week"), computed client-side from the cached 30d query (days 1–7 vs 8–14).
- Down weeks show neutral copy (e.g. "Quieter than last week"), never red or alarming.
- Zero-data state: friendly copy plus a CTA to the links page, not a row of zeros.
- Reads `["pet-analytics", petId, "30d"]` (and `7d`) from the React Query cache — no new endpoint. Rendering the widget pre-warms the analytics page.
- "View analytics" and "Manage links" become real buttons.
- `GetPetAnalyticsSummaryUseCase` / `/analytics/summary` stays in place but becomes unused by the web app; leave a TODO to remove it in 5b.

**Agent.** Main session (web) + test-expert.

**Prompt.**
> Rebuild `apps/web/client/pages/pets/OwnerAnalyticsWidget.tsx` as three stat tiles (views, inquiries, top channel) with `Sparkline`s from `client/components/charts`. Source data from `useQuery` with the analytics page's keys (`["pet-analytics", petId, "7d"]` and `"30d"`) instead of the summary endpoint. Compute week-over-week deltas client-side from the 30d daily series; show increases positively and decreases with neutral wording only. Add an empty state that points at the links page. Buttons, not underlined links. Vitest: delta math, neutral down-week copy, empty state.

---

## 5a-inbox — Inbox facelift + bugs, harvest-ready

**Description.** The inbox (`client/pages/inbox/InboxPage.tsx` + `InboxView.tsx`) is unstyled and has four bugs:

1. Every filter switch flashes the **profile** skeleton (`DataPageSkeleton variant="profile"`), because the query key changes and nothing keeps previous data.
2. On the Unread tab, opening an item marks it read and invalidates the list. The item drops out of the list and the detail pane goes blank mid-read.
3. There's no Archive action anywhere, so the Archived tab can never fill.
4. The detail view never shows the sender's name, email, or the time received.

The UI must also be split so it can be harvested into Lattice at the end of this release: generic presentational components with no Fosterfolio imports, plus a thin Fosterfolio adapter.

**Acceptance criteria.**
- **Structure:** generic components in `apps/web/client/components/inbox/` (`InboxLayout`, `InboxList`, `InboxListItem`, `InboxDetail`, `InboxFilters`). They take a view model (`{ id, title, subtitle, preview, receivedAt, unread, archived }`) plus render slots for detail body and actions. An ESLint `no-restricted-imports` override for that folder forbids `@client/features/*` and `@client/pages/*`. The Fosterfolio mapping (notification → view model, pet chip, source chip) lives in `client/pages/inbox/`.
- **Desktop:** two-pane layout. List rows show sender name, pet name, a one-line message preview, relative time, and an unread dot. Detail header shows sender name, email, and absolute + relative time; then the message, pet chip, source chip, and city/zip.
- **Mobile:** list → full-screen detail with a back button.
- **Actions in detail:** Reply by email (primary), Archive / Unarchive, Mark as unread.
- **Bug 1:** `placeholderData: keepPreviousData` on the list query; an inline list skeleton on first load only; a new `inbox` skeleton variant (not `profile`).
- **Bug 2:** marking read updates the cache optimistically (`setQueryData`) instead of invalidating. An item stays visible in the Unread list until the user changes filters or navigates away.
- **Bug 3:** Archive/Unarchive uses the existing `PATCH /me/notifications/:id`; archived items move tabs.
- **Bug 4:** the detail shows name, email, and timestamp.
- The nav unread badge updates immediately after mark-read, archive, and mark-unread.
- Empty states per filter with warm copy ("No new inquiries — share your foster-me link to get the word out").
- Vitest for each bug's regression, plus one Playwright happy path: open → read → archive → appears under Archived.

**Agent.** Main session (web) + test-expert.

**Prompt.**
> Rebuild the inbox. Create generic, app-agnostic components in `apps/web/client/components/inbox/` driven by a view model and render slots, and add an ESLint `no-restricted-imports` override that blocks `@client/features/*` and `@client/pages/*` from that folder. Move the Fosterfolio mapping into `client/pages/inbox/`. Fix: (1) use `placeholderData: keepPreviousData` and a new `inbox` skeleton variant instead of the profile one; (2) mark-read via optimistic `setQueryData`, not `invalidateQueries`, so items don't vanish from Unread while open; (3) add Archive/Unarchive and Mark-as-unread actions using the existing `updateNotification` API; (4) show sender name, email, and received time in the detail header. Two-pane on desktop, list→detail on mobile. Keep the nav badge in sync. Add Vitest regressions for all four bugs and a Playwright happy path.

---

## 5a-owner-shell — Owner pet bio: admin hero + public preview

**Description.** Today the owner sees the guest page with owner cards stuffed into the sidebar, each labeled "Visible only to you." Replace that with a structural split: an **admin hero** at the top and a **public preview** below the fold. Build the split as a reusable `OwnerPageLayout`, because `/profile` uses it next.

**Acceptance criteria.**
- `OwnerPageLayout` in `client/components/layout/`: `hero` slot (tinted admin band), then a full-width divider labeled "Public preview — this is what visitors see", then a `preview` slot. Visually unmistakable without per-card labels.
- Owner pet bio hero contains: pet name + status, Edit bio button, the new owner analytics widget, Share/QR (via `QrDownloadMenu`) and Manage links.
- Below the divider: the exact guest page (next ticket), rendered read-only. The inquiry CTA in the preview is static and disabled, not floating.
- No sidebar layout on the owner view.
- `OwnerOnlyLabel` removed from pet bio and foster-me owner surfaces (component stays in the repo for now).
- Guests never receive owner-hero markup (render-gated, not CSS-hidden).

**Agent.** Main session (web) + test-expert.

**Prompt.**
> Create `apps/web/client/components/layout/OwnerPageLayout.tsx` with a tinted `hero` slot, a full-width "Public preview — this is what visitors see" divider, and a `preview` slot. Rework `PetBioPage`/`PetBioView` so the owner view uses it: hero = name/status, Edit bio, `OwnerAnalyticsWidget`, QR via `QrDownloadMenu`, Manage links; preview = the guest layout rendered read-only, with the inquiry CTA static and disabled. Drop the sidebar layout for owners and remove `OwnerOnlyLabel` usages on the pet bio and foster-me. Update `PetBioPage.test.tsx` and `PageWithSidebar.test.tsx` as needed; assert guests never render the hero.

---

## 5a-guest-bio — Guest pet bio

**Description.** For guests, the inquiry form sits in a sidebar and the "boring facts" (species, breed, age, weight, sex) sit above the bio. Make the bio the story and the inquiry CTA always reachable.

**Acceptance criteria.**
- Single-column layout: gallery → name + status → bio → facts → foster parent card → updates.
- A floating "Ask about {Pet}" button follows scroll on all viewports and opens a `Sheet` (bottom on mobile, right on desktop) containing the existing inquiry form (`ContactFosterBlock` / `PublicPetSidebar` logic: zip, Turnstile, source, self-reported prompt, success state).
- The button hides while the sheet is open and after a successful submit in this session (it becomes a quiet "Inquiry sent ✓" chip).
- The button respects `env(safe-area-inset-bottom)` and doesn't cover page content at the bottom (add bottom padding equal to its height).
- `inquiry_form_opened` fires when the sheet opens (same event, new trigger point).
- Adopted pets: no CTA.
- Vitest: CTA opens sheet; hidden after success; not rendered for adopted. Playwright: existing inquiry E2E updated to go through the CTA.

**Agent.** Main session (web) + test-expert.

**Prompt.**
> Restructure the guest pet bio in `apps/web/client/pages/pets/` to a single column (gallery, name/status, bio, then `PetFacts`, foster card, updates). Move the inquiry form out of `PublicPetSidebar` into a `Sheet` opened by a floating "Ask about {name}" button that respects safe-area insets, hides while open, and collapses to an "Inquiry sent" chip after success. Fire `inquiry_form_opened` on sheet open. No CTA for adopted pets. Update `PetBioPage.test.tsx` and the inquiry Playwright spec to go through the CTA.

---

## 5a-profile — /profile on the owner shell

**Description.** `/profile` (`client/pages/profile/ProfilePage.tsx`) should mirror the owner pet bio: admin hero up top, pets organized by priority.

**Acceptance criteria.**
- Uses `OwnerPageLayout`. Hero: avatar, name, handle, edit-profile entry, and a prominent **Add pet** button.
- Actively fostered pets render directly under the hero, always above the fold on desktop and on a 375px viewport (compact cards if needed).
- All non-active pets (previously fostered, adopted) go below the fold in a "Past fosters" section.
- Existing profile cards (location, connected sites, profile link) move into the hero or a secondary row. Nothing is lost.
- `OwnerOnlyLabel` removed from the profile surfaces it was on.
- Update `ProfilePage.test.tsx`.

**Agent.** Main session (web) + test-expert.

**Prompt.**
> Rework `apps/web/client/pages/profile/ProfilePage.tsx` onto `OwnerPageLayout`. Hero: avatar, name, handle, edit entry, and a primary "Add pet" button. Directly below: actively fostered pets, compact enough to stay above the fold on a 375px viewport. Below the fold: a "Past fosters" section for every non-active pet. Keep the existing location, connected-sites, and profile-link cards reachable (hero or a secondary row). Remove `OwnerOnlyLabel` usages here. Update `ProfilePage.test.tsx`.

---

## Done when

- Every ticket's acceptance criteria pass, `npm run ci` is green, and the inbox + inquiry Playwright specs pass.
- todo.md §7 is fully ticked.
- A quick manual pass in light and dark at 375px and desktop: inbox, pet analytics, owner pet bio, guest pet bio, /profile.
