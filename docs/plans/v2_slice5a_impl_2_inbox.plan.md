---
name: v2 slice 5a — implementation plan 2 of 3 (inbox)
overview: Second implementation session for docs/plans/v2_slice5a_ux_polish.plan.md, ticket 5a-inbox. Rebuilds /inbox as generic, harvest-ready components plus a thin Fosterfolio adapter, and fixes the four bugs from the 2026-10-09 stress test. Plan 1 (quick wins + analytics) is complete. Plan 3 (owner/guest/profile layouts) is a separate session.
status: pending
todos:
  - id: cp0
    content: "CP0 — API: allow marking a notification unread (read: false)"
    status: pending
  - id: cp1
    content: "CP1 — unread count on React Query so the nav badge can be updated from the inbox"
    status: completed
  - id: cp2
    content: "CP2 — generic inbox components in client/components/inbox + import fence"
    status: pending
  - id: cp3
    content: "CP3 — InboxPage on the new components: bugs 1–4, actions, mobile list→detail, empty states"
    status: pending
  - id: cp4
    content: "CP4 — (time-boxed) Playwright happy path: guest inquiry → owner inbox → archive"
    status: pending
---

# Slice 5a — implementation plan 2 of 3: inbox

Parent plan: [`v2_slice5a_ux_polish.plan.md`](v2_slice5a_ux_polish.plan.md), ticket **5a-inbox**. Plan 1: [`v2_slice5a_impl_1_analytics_and_quick_wins.plan.md`](v2_slice5a_impl_1_analytics_and_quick_wins.plan.md) (done; its chart/QR folders and `DataPageSkeleton` `analytics` variant exist).

## How to run this session (read first)

- Work **checkpoint by checkpoint, in order**. At every **⏸ CHECKPOINT**: run the verify commands, **stop**, post a short review summary (files touched, tests added, anything surprising, any deviation and why), and **wait for "go"**. The user reviews and commits — **never `git commit` / `push` / `stash`**.
- After each approved checkpoint: flip its `status` here, and when CP3 lands flip `5a-inbox` in the parent plan and tick it in `docs/plans/todo.md` §7.
- Code below is the intended shape against the repo as of 2026-10-09. Adapt small signature differences without asking; ask only if a decision here is wrong.
- Fast loop: `npm run test:web:unit -- <file>`, `npx jest <path>`. Checkpoint gate: `npm run ci`.

### ⚠️ Known red — do not fix

`test/web/unit/SearchPage.test.tsx` mocks `next/navigation` without `usePathname`. `AppHeader` → `useUnreadNotificationCount` calls `usePathname`, so **those three SearchPage tests already fail before this plan and will still fail after it.** Treat them as a known red at every checkpoint:

- Do **not** edit `SearchPage.test.tsx` or "fix search" in this session.
- In each checkpoint summary, state the failing set explicitly, e.g. "`npm run ci`: green except the 3 known-red SearchPage tests." Any **other** failure is yours to fix.
- CP1 keeps `usePathname` in the hook on purpose. Don't remove it to make search pass.

---

## The four bugs (reference)

1. Every filter switch flashes the **profile** skeleton (`DataPageSkeleton variant="profile"`), because the query key changes and nothing keeps the previous data.
2. On **Unread**, opening an item marks it read and `invalidateQueries` refetches. The item drops out of the list and the detail pane goes blank mid-read.
3. There's no **Archive** action anywhere, so the Archived tab can never fill.
4. The detail view never shows the **sender name, email, or time received**.

---

## CP0 — API: mark unread  (~20 min)

"Mark as unread" needs the API to accept `read: false`. Today the controller only forwards `read === true`, and `UpdateNotificationUseCase` rejects a body without `read: true` or `archived`.

### 0a. Use case — `apps/api/application/use-cases/UpdateNotificationUseCase.ts`

```ts
export type UpdateNotificationCommand = {
  read?: boolean;
  archived?: boolean;
};

// in execute():
const hasRead = typeof command.read === 'boolean';
const hasArchive = typeof command.archived === 'boolean';
if (!hasRead && !hasArchive) {
  return Result.failure(ErrorCatalog.NOTIFICATION_INVALID_INPUT);
}
// ...
if (hasRead) {
  const updated = await this.notificationRepository.markRead(
    id,
    recipientId,
    command.read ? new Date().toISOString() : null
  );
  if (!updated) return Result.failure(ErrorCatalog.NOTIFICATION_NOT_FOUND);
  current = updated;
}
```

### 0b. Repositories

- `INotificationRepository.markRead(id, recipientId, readAt: string | null)`.
- `NotificationRepository` (Supabase): today it returns early `if (existing.readAt) return existing;`. Change to: if `readAt` is non-null **and** the row is already read, return early (keep the first-read timestamp); if `readAt` is null, always write `{ read_at: null }`.
- `InMemoryNotificationRepository`: same rule — `if (readAt === null) row.readAt = null; else if (!row.readAt) row.readAt = readAt;`.

### 0c. Controller — `NotificationController.update`

```ts
...(typeof body.read === 'boolean' ? { read: body.read } : {}),
```

### 0d. Tests — `test/api/notifications.test.ts`

Add: PATCH `{ read: false }` on a read notification → `readAt` null and unread-count goes back up by 1; PATCH `{ read: true }` twice keeps the first timestamp; empty body still 400.

**⏸ CHECKPOINT 0** — `npm run ci` (expect only the known-red SearchPage set). Summary + wait. Suggested commit: `Let owners mark an inquiry unread again.`

---

## CP1 — unread count on React Query  (~20 min)

The badge hook keeps its count in local `useState`, so the inbox has no way to update it. Move it to a shared query key that inbox mutations can write to.

### 1a. Query keys — new `client/features/notifications/queryKeys.ts`

```ts
export const notificationKeys = {
  all: ["notifications"] as const,
  list: (status: "unread" | "all" | "archived") => ["notifications", "list", status] as const,
  lists: ["notifications", "list"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};
```

### 1b. `client/features/notifications/useUnreadNotificationCount.ts`

```ts
"use client";

import { useAuth } from "@client/auth";
import { fetchUnreadCount } from "@client/features/notifications/notificationsApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { notificationKeys } from "./queryKeys";

/** Refetches on window focus (React Query default) and on route change. No websocket. */
export function useUnreadNotificationCount(enabled: boolean): number {
  const { getAccessToken } = useAuth();
  const pathname = usePathname(); // keep — see "Known red" in the plan header
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: notificationKeys.unreadCount,
    enabled,
    queryFn: async () => {
      const token = await getAccessToken();
      return token ? fetchUnreadCount(token) : 0;
    },
  });

  useEffect(() => {
    if (enabled) void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
  }, [enabled, pathname, queryClient]);

  return enabled ? (query.data ?? 0) : 0;
}
```

Errors fall back to `0` via `query.data ?? 0` (the old hook did `setCount(0)` in a catch). `AppHeader` usage doesn't change. Anything that renders `AppHeader` in tests now needs a `QueryClientProvider`. Most page tests already use `renderWithQueryClient`; fix any non-SearchPage test that breaks by switching it to that helper.

**⏸ CHECKPOINT 1** — `npm run ci` (expect only the known-red SearchPage set). Manually: badge still shows and updates after focusing the tab. Summary + wait. Suggested commit: `Share the unread inquiry count through React Query.`

---

## CP2 — generic inbox components  (~45 min)

New folder `apps/web/client/components/inbox/`. **Nothing in it may import `@client/features/*` or `@client/pages/*`**, because it's being harvested into Lattice. It takes a view model plus render slots.

### 2a. Import fence — `apps/web/eslint.config.mjs`

Fence the three harvest folders at once (`inbox`, plus plan 1's `charts` and `qr`):

```js
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: [
      "client/components/inbox/**/*.{ts,tsx}",
      "client/components/charts/**/*.{ts,tsx}",
      "client/components/qr/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@client/features/*", "@client/pages/*"], message: "Harvestable component: no app/feature imports. Pass data in via props." },
          ],
        },
      ],
    },
  },
];
```

Run `npm run lint` once with a deliberate bad import to confirm it fires, then remove it.

### 2b. View model — `components/inbox/types.ts`

```ts
export type InboxEntry = {
  id: string;
  /** Bold line, e.g. sender name. */
  title: string;
  /** Secondary line, e.g. "About Mochi". */
  subtitle?: string;
  /** One-line message preview. */
  preview?: string;
  receivedAt: string; // ISO
  unread: boolean;
  archived: boolean;
};

export type InboxFilterOption<T extends string> = { value: T; label: string; count?: number };
```

### 2c. Time formatting — `components/inbox/formatReceived.ts`

No date library in the repo, so use `Intl`:

```ts
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31_536_000], ["month", 2_592_000], ["week", 604_800],
  ["day", 86_400], ["hour", 3_600], ["minute", 60],
];

export function relativeReceived(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  if (Number.isNaN(seconds)) return "";
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function absoluteReceived(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
```

### 2d. Components (all `"use client"`, shadcn primitives + `cn` only)

- **`InboxFilters<T>`** — `{ value: T; options: InboxFilterOption<T>[]; onChange(v: T) }`. A segmented control: `role="group"`, buttons with `aria-pressed`, the active one `bg-background shadow-sm`, inside a `bg-muted rounded-lg p-1` track. Show `count` as a small pill when present (used for Unread).
- **`InboxListItem`** — `{ entry; selected; onSelect }`. A full-width `<button>` row: an unread dot (`bg-primary size-2 rounded-full`, invisible but space-reserving when read) · title (`font-semibold` when unread, else `font-medium text-muted-foreground`) · relative time on the right (`text-xs tabular-nums`, with the absolute time in `title`) · subtitle · one-line `truncate` preview. Selected: `bg-muted`. Add `aria-current="true"` when selected.
- **`InboxList`** — `{ entries; selectedId; onSelect; empty: ReactNode; loading?: boolean }`. A `<ul>` with `divide-y`. When `loading` and no entries, render 4 skeleton rows (`bg-muted animate-pulse h-16 rounded-md`). When it has no entries, render `empty`.
- **`InboxDetailHeader`** — `{ title; subtitle?: ReactNode; receivedAt; actions?: ReactNode }`. Title in `text-lg font-semibold`, subtitle line (the app passes the email), then "absolute · relative" time, with actions right-aligned (they wrap under the title on mobile).
- **`InboxLayout`** — `{ filters; list; detail; hasSelection; onBack; backLabel? }`:

```tsx
export function InboxLayout({ filters, list, detail, hasSelection, onBack, backLabel = "Back to inbox" }: InboxLayoutProps) {
  return (
    <div className="grid min-h-[60dvh] gap-0 md:grid-cols-[22rem_1fr] md:rounded-xl md:border">
      <section aria-label="Messages" className={cn("space-y-3 md:border-r md:p-3", hasSelection && "hidden md:block")}>
        {filters}
        {list}
      </section>
      <section aria-label="Message" className={cn("md:p-6", !hasSelection && "hidden md:block")}>
        <Button type="button" variant="ghost" size="sm" className="mb-3 md:hidden" onClick={onBack}>
          <ChevronLeft aria-hidden /> {backLabel}
        </Button>
        {detail}
      </section>
    </div>
  );
}
```

`index.ts` exports all of the above, plus the types and formatters.

### 2e. Tests — `test/web/unit/inboxComponents.test.tsx`

- `relativeReceived` with a fixed `now` covers just now, minutes, yesterday, and weeks.
- `InboxListItem`: an unread entry renders the bold title and the dot; clicking calls `onSelect`; selected sets `aria-current`.
- `InboxLayout`: with `hasSelection`, the messages section has the `hidden` class (mobile) and the back button calls `onBack`.

**⏸ CHECKPOINT 2** — `npm run ci` (only the known red). Summary + wait. Suggested commit: `Add generic, app-agnostic inbox components and fence harvestable folders from app imports.`

---

## CP3 — InboxPage on the new components  (~60 min)

Files: `client/pages/inbox/InboxPage.tsx`, rewrite `client/pages/inbox/InboxView.tsx` as the Fosterfolio adapter, new `client/pages/inbox/inquiryEntry.ts`, `client/components/layout/DataPageSkeleton.tsx`.

### 3a. Adapter — `pages/inbox/inquiryEntry.ts`

```ts
import type { InboxEntry } from "@client/components/inbox";
import type { InboxItem } from "@client/features/notifications/types";

const text = (v: string | null | undefined) => v?.trim() ?? "";

export function toInboxEntry(item: InboxItem): InboxEntry {
  const pet = item.pet?.name ? `About ${item.pet.name}` : undefined;
  return {
    id: item.id,
    title: text(item.payload.senderName) || "Someone",
    subtitle: pet,
    preview: text(item.payload.message).replace(/\s+/g, " ") || undefined,
    receivedAt: item.createdAt,
    unread: item.readAt == null && item.archivedAt == null,
    archived: item.archivedAt != null,
  };
}
```

Keep the existing source-chip logic (`channelDisplayName`, link label, self-reported, "Direct / original QR"), the pet chip (including "No longer available"), and the zip in an `InquiryDetailBody` component inside `InboxView.tsx`. `InboxView` composes `InboxLayout` + `InboxFilters` + `InboxList` + `InboxDetailHeader` + `InquiryDetailBody`.

### 3b. Detail (fixes bug 4)

- `InboxDetailHeader` gets `title` = sender name, `subtitle` = `<a href="mailto:…">{email}</a>` (or "No email given"), and `receivedAt` = `item.createdAt`.
- Body: the message in `whitespace-pre-wrap text-sm leading-relaxed`, then a chip row (pet chip, source chip, "Near {zip}" when zip exists).
- Actions (`actions` slot):
  - **Reply by email**: primary button-styled `<a href="mailto:{email}?subject=Re: {pet name}">`. Hidden when there's no email.
  - **Archive**, or **Move to inbox** when archived: outline button.
  - **Mark as unread**: ghost button, shown only when the item is read and not archived.

### 3c. Data + mutations — `InboxPage.tsx`

```tsx
const [status, setStatus] = useState<InboxFilter>("unread");
const [selectedId, setSelectedId] = useState<string | null>(null);

const inbox = useQuery({
  queryKey: notificationKeys.list(status),
  enabled: Boolean(user),
  placeholderData: keepPreviousData,              // bug 1: no flash between filters
  queryFn: async () => fetchNotifications((await getAccessToken()) ?? "", status),
});

const items = inbox.data?.items ?? [];
const selected = items.find((i) => i.id === selectedId) ?? null;

/** Patch one item in every cached list without refetching (bug 2). */
function patchItem(id: string, patch: Partial<InboxItem>) {
  queryClient.setQueriesData<InboxPage>({ queryKey: notificationKeys.lists }, (page) =>
    page ? { ...page, items: page.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) } : page,
  );
}
function bumpUnread(delta: number) {
  queryClient.setQueryData<number>(notificationKeys.unreadCount, (n) => Math.max(0, (n ?? 0) + delta));
}

const update = useMutation({
  mutationFn: async (v: { id: string; body: { read?: boolean; archived?: boolean } }) =>
    updateNotification((await getAccessToken()) ?? "", v.id, v.body),
  onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount }),
});

function open(item: InboxItem) {
  setSelectedId(item.id);
  if (item.readAt) return;
  patchItem(item.id, { readAt: new Date().toISOString() }); // stays in the Unread list: no list invalidate
  bumpUnread(-1);
  update.mutate({ id: item.id, body: { read: true } });
}
function markUnread(item: InboxItem) {
  patchItem(item.id, { readAt: null });
  bumpUnread(+1);
  update.mutate({ id: item.id, body: { read: false } });
}
function setArchived(item: InboxItem, archived: boolean) {
  update.mutate(
    { id: item.id, body: { archived } },
    {
      onSuccess: () => {
        setSelectedId(null);
        void queryClient.invalidateQueries({ queryKey: notificationKeys.lists }); // archive SHOULD move it between tabs
      },
    },
  );
}
```

Why it holds: open and mark-unread only **patch** the cache, so the item stays put in Unread while you read it. Lists refetch when the user switches filters (the key changes and stale data refetches behind `keepPreviousData`) or when archive explicitly invalidates. Clear `selectedId` on filter change, as today.

### 3d. Loading (bug 1)

- Add an `inbox` variant to `DataPageSkeleton`: a header bone, then a `md:grid-cols-[22rem_1fr]` block with 5 row bones on the left and one tall bone on the right. Use it only for the **first** load (`loading || (inbox.isLoading && !inbox.data)`). Never use `variant="profile"` here again.
- Filter switches keep showing the previous list (`keepPreviousData`), with a subtle `opacity-60` on the list while `inbox.isFetching && inbox.isPlaceholderData`.

### 3e. Empty states (`InboxList` `empty` slot)

- **Unread:** "You're all caught up." + "New inquiries land here and in your email."
- **All:** "No inquiries yet." + "Share your pet's link or QR code to get the word out."
- **Archived:** "Nothing archived." + "Archive an inquiry once you've handled it."

Detail pane with nothing selected (desktop only): a centered muted icon (`Inbox` from lucide) and "Select an inquiry to read it."

### 3f. Filters

`InboxFilters` options: Unread (with `count` from `useUnreadNotificationCount(true)` so it matches the badge), All, Archived. **Default stays Unread.**

### 3g. Tests

Rewrite `test/web/unit/InboxView.test.tsx` against the new `InboxView` (keep its existing assertions about source, zip, pet link, and reply where they still apply; the reply link now includes `?subject=`). Then add a page-level `test/web/unit/InboxPage.test.tsx` that mocks `@client/features/notifications/notificationsApi` and uses `renderWithQueryClient` with `authSignedIn()`. One test per bug:

1. Switching Unread → All never renders the "Loading inbox" skeleton after first load.
2. On Unread, opening an item keeps it in the list and keeps the detail visible, and `updateNotification` was called with `{ read: true }`.
3. Clicking Archive calls `updateNotification` with `{ archived: true }`; after the refetch (mock returns it under `archived`) it shows on the Archived tab.
4. The detail shows the sender name, a mailto link to the email, and a time string.

Plus: "Mark as unread" calls `{ read: false }`.

**⏸ CHECKPOINT 3** — `npm run ci` (only the known red). Then manually at desktop and 375px, light and dark: open an unread inquiry (the badge drops immediately and the item stays), mark it unread (the badge rises), archive it (it moves to Archived), and switch filters with no skeleton flash. Summary + wait. Once approved, flip `5a-inbox` in the parent plan and tick it in todo.md §7. Suggested commit: `Rebuild the inquiry inbox: two-pane layout, archive and unread actions, and no skeleton flash.`

---

## CP4 — Playwright happy path  (time-box: 20 min)

Optional and time-boxed. `test/web/e2e/product.spec.ts` already submits a guest inquiry and has owner-signed-in tests (e.g. "owner public profile offers edit"). If the e2e API stack creates the notification on inquiry, add one test: guest sends an inquiry on a pet bio → sign in as that pet's owner using the same helper the owner tests use → `/inbox` → open the inquiry → Archive → Archived tab shows it.

If the harness can't do this within 20 minutes (e.g. notifications aren't created in the e2e stack), **skip it**, leave a `test.fixme` with a one-line reason, and say so in the summary. Don't build e2e infrastructure in this session.

**⏸ CHECKPOINT 4** — `npx playwright test --config test/web/playwright.config.ts product` (ports 3000/3001 must be free). Summary + wait. Suggested commit: `Cover the inbox read-and-archive path end to end.`

---

## 🛑 End of session

After CP4 (or CP3, if CP4 was skipped), stop. Post:

> **Plan 2 done.** Checkpoints approved: … Known red unchanged: the 3 SearchPage tests (`usePathname` missing from their `next/navigation` mock). Deviations: … Please start a **new session** for plan 3 (`v2_slice5a_impl_3_layouts.plan.md`).
