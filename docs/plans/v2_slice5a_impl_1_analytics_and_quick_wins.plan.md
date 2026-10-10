---
name: v2 slice 5a — implementation plan 1 of 3 (quick wins + analytics)
overview: First of three implementation sessions for docs/plans/v2_slice5a_ux_polish.plan.md. Covers 5a-todo-md, 5a-presets, 5a-qr-sizes, 5a-charts, 5a-analytics-page, 5a-owner-widget. Inbox (plan 2) and the owner/guest/profile layouts (plan 3) are separate sessions and are NOT written yet.
status: pending
todos:
  - id: cp0
    content: "CP0 — todo.md §7 + trim channel presets"
    status: completed
  - id: cp1
    content: "CP1 — QR download sizes (QrDownloadMenu) + kill the placeholder dialog copy"
    status: completed
  - id: cp2
    content: "CP2 — chart primitives: shadcn chart, series color tokens, Sparkline, jsdom ResizeObserver stub"
    status: completed
  - id: cp3
    content: "CP3 — API: inquiriesByDay on PetAnalyticsDto + range regression test"
    status: completed
  - id: cp4
    content: "CP4 — pet analytics page: prefetch 3 ranges, analytics skeleton, real charts, color"
    status: pending
  - id: cp5
    content: "CP5 — owner analytics widget: tiles, sparklines, week-over-week, empty state"
    status: pending
---

# Slice 5a — implementation plan 1 of 3: quick wins + analytics

Parent plan: [`v2_slice5a_ux_polish.plan.md`](v2_slice5a_ux_polish.plan.md) (read its Context + ground rules once; don't re-derive decisions from it).

## How to run this session (read first)

- Work **checkpoint by checkpoint, in order**. Each checkpoint ends with a **⏸ CHECKPOINT** block.
- At every checkpoint: run the verify commands, then **stop** and post a short review summary (files touched, tests added, anything surprising, any deviation from this plan and why). **Wait for the user to say "go"** before starting the next checkpoint. The user reviews and commits — **do not `git commit`, `git push`, or `git stash`** yourself.
- After each checkpoint is approved: flip that checkpoint's `status` to `completed` in this file's frontmatter, flip the matching ticket in the parent plan, and tick its line in `docs/plans/todo.md` §7.
- Code in this plan is the intended shape, written against the repo as of 2026-10-09. If a signature differs slightly, adapt — don't stop to ask. Stop and ask only if a decision in this plan turns out to be wrong.
- Fast loop while working: `npm run test:web:unit -- <file>` and `npx jest <path>`. Full gate at checkpoints: `npm run ci`.
- **Session budget:** this plan ends after CP5. Do not start the inbox or layout work — those get their own plans and a fresh session.

---

## CP0 — todo.md §7 + trim channel presets  (~10 min)

### 0a. `docs/plans/todo.md`

Append after §6 (before `## Related`):

```md
## 7. v2 slice 5a — UX polish

Plan: [v2_slice5a_ux_polish.plan.md](v2_slice5a_ux_polish.plan.md). Implementation: [plan 1](v2_slice5a_impl_1_analytics_and_quick_wins.plan.md) (plans 2–3 written after plan 1 lands).

- [ ] 5a-presets — drop "Other" and "Shelter listing" presets
- [ ] 5a-qr-sizes — Web / A4 / Large print QR downloads
- [ ] 5a-charts — shared chart primitives
- [ ] 5a-analytics-page — real charts, prefetched ranges, right skeleton
- [ ] 5a-owner-widget — tiles + sparklines + week-over-week
- [ ] 5a-inbox — facelift + 4 bugs, harvest-ready (plan 2)
- [ ] 5a-owner-shell — admin hero + public preview (plan 3)
- [ ] 5a-guest-bio — single column + floating inquiry CTA (plan 3)
- [ ] 5a-profile — /profile on the owner shell (plan 3)
```

Also, in §5, under the struck-through "visible only to you" line, add: `→ Superseded by 5a-owner-shell (§7): the owner/public split becomes structural and these labels go away.`
In §4, at the end of the "foster-me and the pet bio should not be the same page" bullet, add: `→ Addressed by slice 5b (foster-me preview page).`

### 0b. Presets

`apps/api/domain/channels/channelPresets.ts` — delete two entries, nothing else:

```ts
export const CHANNEL_PRESETS = [
  { key: 'lawn_sign', name: 'Lawn sign' },
  { key: 'instagram', name: 'Instagram' },
  { key: 'facebook', name: 'Facebook' },
  { key: 'tiktok', name: 'TikTok' },
  { key: 'flyer', name: 'Flyer' },
] as const;
```

No guard for existing rows using `other` / `shelter_listing` (operator deletes them manually; a user typing "Shelter listing" later just gets a normal custom channel).

Update fixtures/asserts that list presets — known hits: `test/api/utils/channelPresets.test.ts` (the "stable preset order" test), plus check `test/api/trackedLinks.test.ts`, `test/api/trackedLinkUseCases.test.ts`, `test/api/repositories/inMemoryTrackedLinkRepository.test.ts`, `test/web/unit/LinksManager.test.tsx`, `test/web/unit/PetEditorPage.test.tsx` with `grep -n "shelter_listing\|'other'\|\"other\"\|Shelter listing"`. Note `apps/api/domain/entities/Pet.ts` / `features/pets/types.ts` match `other` for **species** — leave those alone.

**⏸ CHECKPOINT 0** — `npm run ci`. Summary + wait. Suggested commit: `Drop the Other and Shelter listing channel presets and track slice 5a in todo.`

---

## CP1 — QR download sizes  (~30 min)

All four QR surfaces (`LinksManager`, `ShareLinkCard`, `ProfileLinkCard`, `PetQrDownload`) already funnel through `ShareQrDownload` (directly or via `ShareQrDialog`). Change those two components and every caller gets the menu — **no caller edits**.

### 1a. New `apps/web/client/components/qr/qrDownload.ts` (pure, app-agnostic)

```ts
export type QrDownloadSize = {
  id: "web" | "a4" | "print";
  label: string;
  hint: string;
  format: "png" | "svg";
  /** PNG pixel width; ignored for SVG. */
  width?: number;
};

export const QR_DOWNLOAD_SIZES: readonly QrDownloadSize[] = [
  { id: "web", label: "For sharing on the web", hint: "PNG · 512px", format: "png", width: 512 },
  { id: "a4", label: "For an A4 flyer", hint: "PNG · 1240px (≈10 cm at 300 dpi)", format: "png", width: 1240 },
  { id: "print", label: "For large prints", hint: "SVG · scales to any size", format: "svg" },
];

const QR_COLORS = { dark: "#111111", light: "#ffffff" };

export function qrFilename(base: string, size: QrDownloadSize): string {
  const safe = base.trim().replace(/[^\w.-]+/g, "-") || "share";
  return `${safe}-fosterfolio-qr-${size.id}.${size.format}`;
}

/** Generates the file and clicks a temporary <a download>. */
export async function downloadQr(url: string, base: string, size: QrDownloadSize): Promise<void> {
  const QRCode = (await import("qrcode")).default;
  const common = { margin: 4, errorCorrectionLevel: "M" as const, color: QR_COLORS };
  let href: string;
  let revoke = false;
  if (size.format === "png") {
    href = await QRCode.toDataURL(url, { ...common, width: size.width });
  } else {
    const svg = await QRCode.toString(url, { ...common, type: "svg" });
    href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    revoke = true;
  }
  const link = document.createElement("a");
  link.href = href;
  link.download = qrFilename(base, size);
  link.click();
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 0);
}
```

Margin 4 is the QR-spec quiet zone; it matters for printed signs. (The on-screen preview keeps margin 2.)

### 1b. New `apps/web/client/components/qr/QrDownloadMenu.tsx`

Base UI menu (this repo's shadcn style is `base-nova`); style the trigger with `buttonVariants`, same pattern as `AppHeader`'s account menu.

```tsx
"use client";

import { buttonVariants } from "@client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import { cn } from "@client/lib/utils";
import { ChevronDown, Download } from "lucide-react";
import { useState } from "react";
import { downloadQr, QR_DOWNLOAD_SIZES } from "./qrDownload";

type QrDownloadMenuProps = {
  /** Absolute URL encoded in the QR. */
  url: string;
  filenameBase: string;
  triggerLabel?: string;
};

export function QrDownloadMenu({ url, filenameBase, triggerLabel = "Download QR" }: QrDownloadMenuProps) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <DropdownMenu>
        <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <Download aria-hidden />
          {triggerLabel}
          <ChevronDown aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {QR_DOWNLOAD_SIZES.map((size) => (
            <DropdownMenuItem
              key={size.id}
              onClick={() => {
                setError(null);
                downloadQr(url, filenameBase, size).catch(() => setError("Could not create that file."));
              }}
            >
              <div className="flex flex-col">
                <span>{size.label}</span>
                <span className="text-muted-foreground text-xs">{size.hint}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
```

Add `apps/web/client/components/qr/index.ts` exporting both. Keep `client/components/qr/` free of `@client/features/*` / `@client/pages/*` imports (Lattice harvest).

### 1c. Wire it in

- `ShareQrDownload.tsx`: keep the preview generation as-is; delete `downloadPng`; replace the `<Button>…Download PNG</Button>` with
  `<QrDownloadMenu url={absoluteUrl} filenameBase={downloadName} />`, where `absoluteUrl` is the same `${origin}${href}` already built inside the effect — hoist it to a `useMemo` so both the preview and the menu use one value.
- `ShareQrDialog.tsx`: replace the placeholder description with `Pick a size for the web, an A4 flyer, or a large print.`
- The stress-test recording showed this dialog rendering over a half-transparent page with content bleeding through. While you're here, open it in the browser; if `DialogContent` has no solid `bg-popover`/`bg-background`, add it. Mention what you found in the checkpoint summary.

### 1d. Tests — `test/web/unit/qrDownload.test.ts`

Test the pure module (menu interaction in jsdom is not worth it):

```ts
import { downloadQr, qrFilename, QR_DOWNLOAD_SIZES } from "@client/components/qr/qrDownload";
import { afterEach, describe, expect, it, vi } from "vitest";

const toDataURL = vi.fn(async () => "data:image/png;base64,AAA");
const toString = vi.fn(async () => "<svg/>");
vi.mock("qrcode", () => ({ default: { toDataURL, toString } }));

const [web, a4, print] = QR_DOWNLOAD_SIZES;

describe("qrDownload", () => {
  afterEach(() => vi.clearAllMocks());

  it("names files by size", () => {
    expect(qrFilename("Mochi the Dog", web)).toBe("Mochi-the-Dog-fosterfolio-qr-web.png");
    expect(qrFilename("  ", print)).toBe("share-fosterfolio-qr-print.svg");
  });

  it("renders PNGs at the size's width with a print-safe quiet zone", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await downloadQr("https://x.test/@a", "Mochi", a4);
    expect(toDataURL).toHaveBeenCalledWith("https://x.test/@a", expect.objectContaining({ width: 1240, margin: 4, errorCorrectionLevel: "M" }));
    expect(click).toHaveBeenCalledOnce();
  });

  it("renders large prints as SVG", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => "blob:qr");
    URL.revokeObjectURL = vi.fn();
    await downloadQr("https://x.test/@a", "Mochi", print);
    expect(toString).toHaveBeenCalledWith("https://x.test/@a", expect.objectContaining({ type: "svg" }));
  });
});
```

Existing tests that click "Download PNG" — none found in `test/`; re-grep to be sure.

**⏸ CHECKPOINT 1** — `npm run ci`, then manually: open a link's QR dialog, download all three sizes, scan the A4 PNG and the SVG with a phone. Summary + wait. Suggested commit: `Offer web, A4, and large-print QR downloads.`

---

## CP2 — chart primitives  (~30 min)

### 2a. Install

From `apps/web`: `npx shadcn@latest add chart`. This adds `client/components/ui/chart.tsx` and `recharts` to `apps/web/package.json`. Commit the lockfile change with this checkpoint.

### 2b. Series colors — `client/styles/globals.css`

The existing `--chart-1..5` tokens are all grayscale (neutral base), so "add color" needs new tokens. Two semantic series, validated (both modes pass lightness band, chroma floor, CVD ΔE ≥ 24, normal-vision ΔE ≥ 31, ≥ 3:1 contrast):

```css
/* in :root */
  --series-views: #2a78d6;
  --series-inquiries: #eb6834;

/* in .dark */
  --series-views: #3987e5;
  --series-inquiries: #d95926;

/* in @theme inline */
  --color-series-views: var(--series-views);
  --color-series-inquiries: var(--series-inquiries);
```

Rules for every chart in this slice: **views are always blue, inquiries always orange**, everywhere. **Numbers and labels stay in text colors** (`text-foreground` / `text-muted-foreground`); color only appears on marks, dots, and lines. Never use the destructive red for a "down" trend.

### 2c. `client/components/charts/chartConfig.ts`

```ts
import type { ChartConfig } from "@client/components/ui/chart";

export const seriesConfig = {
  views: { label: "Views", color: "var(--series-views)" },
  inquiries: { label: "Inquiries", color: "var(--series-inquiries)" },
} satisfies ChartConfig;

export type SeriesKey = keyof typeof seriesConfig;
```

`ChartContainer` turns each `color` into `--color-<key>`, so marks use `fill="var(--color-views)"`.

### 2d. `client/components/charts/Sparkline.tsx`

```tsx
"use client";

import { ChartContainer } from "@client/components/ui/chart";
import { Line, LineChart } from "recharts";
import { seriesConfig, type SeriesKey } from "./chartConfig";

type SparklineProps = {
  /** Oldest → newest. */
  values: number[];
  series: SeriesKey;
  label: string;
};

export function Sparkline({ values, series, label }: SparklineProps) {
  if (values.length < 2) return null;
  const data = values.map((y, x) => ({ x, y }));
  return (
    <ChartContainer config={seriesConfig} className="aspect-auto h-10 w-full" role="img" aria-label={label}>
      <LineChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
        <Line dataKey="y" type="monotone" stroke={`var(--color-${series})`} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ChartContainer>
  );
}
```

Add `client/components/charts/index.ts`. Keep this folder free of feature/page imports.

### 2e. jsdom — `test/web/vitest.setup.ts`

Recharts' `ResponsiveContainer` needs `ResizeObserver`, which jsdom lacks. Append:

```ts
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
```

Charts still render at 0×0 in jsdom, so **assert on titles, aria-labels, and the sr-only tables, never on SVG paths.**

### 2f. `/ui` gallery

In `client/pages/ui-gallery/UiGalleryPage.tsx`, add a small "Charts" section: one `Sparkline` per series and a 3-row horizontal bar chart (CP4's `ChannelBarChart` can replace it later). This is the light/dark eyeball surface.

**⏸ CHECKPOINT 2** — `npm run ci` (includes the static-export `build`; Recharts must stay inside `"use client"` files). Open `/ui` in light and dark. Summary + wait. Suggested commit: `Add Recharts-based chart primitives and the views/inquiries series colors.`

---

## CP3 — API: `inquiriesByDay`  (~20 min)

### 3a. `apps/api/application/analytics/petAnalytics.ts`

Add to `PetAnalyticsDto`:

```ts
  inquiriesByDay: Array<{ day: string; inquiries: number }>;
```

In `buildPetAnalytics`, inside the existing `for (const inquiry of inquiries)` loop:

```ts
    const day = inquiry.createdAt.slice(0, 10); // ISO from Supabase/in-memory; UTC day
    inquiriesByDay.set(day, (inquiriesByDay.get(day) ?? 0) + 1);
```

(declare `const inquiriesByDay = new Map<string, number>();` with the other maps) and return

```ts
    inquiriesByDay: [...inquiriesByDay.entries()]
      .map(([day, count]) => ({ day, inquiries: count }))
      .sort((a, b) => a.day.localeCompare(b.day)),
```

The inquiry rows passed in are already range-filtered (`listSourcesByPetId(petId, sinceIso)`), so no extra range logic. Leave `GetPetAnalyticsSummaryUseCase` alone (removed in 5b).

### 3b. Web type — `client/features/petInsights/types.ts`

Add `inquiriesByDay: Array<{ day: string; inquiries: number }>;` to `PetAnalytics`, and add `inquiriesByDay: []` to the `emptyAnalytics` fixture in `test/web/unit/AnalyticsView.test.tsx`.

### 3c. Tests — `test/api/petAnalytics.test.ts`

In the first test ("returns owner rollup analytics…"), after the existing assertions, add `inquiriesByDay` expectations matching its seeded inquiries (two on `utcDay(-1)`, plus whatever else it seeds). Then add one test that pins the range behavior the planning pass suspected was broken:

```ts
  it('scopes byLink to the requested range', async () => {
    // Reuse the first test's setup: linkA has views on day -1 (4 + 1) and day -40 (7).
    // GET ?range=7d  → byLink row for linkA has views 5
    // GET ?range=all → byLink row for linkA has views 12
  });
```

(Extract the seeding into a local helper rather than copy-pasting it.) If this test **fails**, the bug is real — fix it in `buildPetAnalytics` / the repo `listByPetId` filter and call it out in the checkpoint summary. If it passes, as code reading suggests, note that the 150-vs-370 discrepancy was a mid-switch recording artifact.

**⏸ CHECKPOINT 3** — `npm run ci`. Summary + wait. Suggested commit: `Return inquiries per day with pet analytics and pin range scoping for links.`

---

## CP4 — pet analytics page  (~60 min)

Files: `client/pages/pets/PetAnalyticsPage.tsx`, `client/pages/pets/AnalyticsView.tsx`, `client/features/petInsights/present.ts`, `client/components/layout/DataPageSkeleton.tsx`, new `client/pages/pets/analyticsCharts.tsx`.

### 4a. Prefetch all three ranges — `PetAnalyticsPage.tsx`

Replace the single `analytics` `useQuery` with:

```tsx
const RANGES = ["7d", "30d", "all"] as const;
type Range = (typeof RANGES)[number];

const analytics = useQueries({
  queries: RANGES.map((r) => ({
    queryKey: ["pet-analytics", petId, r] as const, // unchanged key shape — CP5 reads these
    enabled: Boolean(petId && isOwner),
    staleTime: 60_000,
    queryFn: async () => fetchPetAnalytics((await getAccessToken()) ?? "", petId!, r),
  })),
  combine: (results) => ({
    byRange: Object.fromEntries(RANGES.map((r, i) => [r, results[i]?.data])) as Record<Range, PetAnalytics | undefined>,
    isLoading: results.some((q) => q.isLoading),
    isError: results.some((q) => q.isError),
  }),
});
const current = analytics.byRange[range];
```

- The loading gate becomes `loading || pet.isLoading || (isOwner && (analytics.isLoading || links.isLoading))`, so one skeleton is shown until **all three** ranges are in. Range toggles are then pure `useState`, with no refetch and no skeleton.
- Today an API error falls through to "only available to the pet owner". Split it: when `isOwner && analytics.isError`, render `Couldn't load analytics. Try again in a moment.` instead.
- Swap `variant="pet"` for `variant="analytics"`.

### 4b. Skeleton — `DataPageSkeleton.tsx`

Add `"analytics"` to the `variant` union and a shape:

```tsx
function AnalyticsShape() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Bone className="h-8 w-56" />
        <Bone className="h-8 w-32" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Bone className="h-24" />
        <Bone className="h-24" />
        <Bone className="h-24" />
      </div>
      <Bone className="h-56" />
      <Bone className="h-40" />
    </div>
  );
}
```

Wire it into the variant switch. Plan 2 adds an `inbox` variant the same way.

### 4c. Trend bucketing — `present.ts`

Replace `bucketViewsByDay` with a two-series version that **zero-fills missing days**. Today, days with no rows simply vanish, which makes lines lie. Keep the existing "< 14 days with views → weekly" rule and the `weekStart` helper.

```ts
export type TrendBucket = { label: string; views: number; inquiries: number };

export function bucketTrend(
  views: Array<{ day: string; views: number }>,
  inquiries: Array<{ day: string; inquiries: number }>,
): { grain: "day" | "week"; points: TrendBucket[] } {
  const byDay = new Map<string, TrendBucket>();
  for (const p of views) byDay.set(p.day, { label: p.day, views: p.views, inquiries: byDay.get(p.day)?.inquiries ?? 0 });
  for (const p of inquiries) byDay.set(p.day, { label: p.day, views: byDay.get(p.day)?.views ?? 0, inquiries: p.inquiries });
  if (byDay.size === 0) return { grain: "day", points: [] };

  const days = [...byDay.keys()].sort();
  const filled: TrendBucket[] = [];
  for (let d = days[0]!; d <= days[days.length - 1]!; d = addDays(d, 1)) {
    filled.push(byDay.get(d) ?? { label: d, views: 0, inquiries: 0 });
  }

  const daysWithViews = filled.filter((p) => p.views > 0).length;
  if (daysWithViews >= 14) return { grain: "day", points: filled };

  const weeks = new Map<string, TrendBucket>();
  for (const p of filled) {
    const label = weekStart(p.label);
    const w = weeks.get(label) ?? { label, views: 0, inquiries: 0 };
    w.views += p.views;
    w.inquiries += p.inquiries;
    weeks.set(label, w);
  }
  return { grain: "week", points: [...weeks.values()] };
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
```

Remove `bucketViewsByDay` if nothing else imports it (grep). Add `test/web/unit/bucketTrend.test.ts` covering: zero-fill across a gap, weekly fallback, inquiries-only days, and empty input.

### 4d. Charts — new `client/pages/pets/analyticsCharts.tsx`

Two rules from the dataviz pass shape this:

- **No dual axis, and inquiries are ~1–5% of views.** Don't put both measures on one bar or line scale; inquiries would be invisible. Use **small multiples**: views and inquiries each get their own chart, aligned on the same categories or the same x-axis.
- Every chart gets a hover tooltip, a legend or title naming the series, and an sr-only table, so identity never depends on color alone.

```tsx
"use client";

import { seriesConfig, type SeriesKey } from "@client/components/charts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@client/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { TrendBucket } from "@client/features/petInsights/present";

/** One measure per chart; render two side by side for views + inquiries. */
export function ChannelBarChart({
  rows,
  series,
  title,
}: {
  rows: Array<{ name: string; value: number }>;
  series: SeriesKey;
  title: string;
}) {
  return (
    <figure className="space-y-2">
      <figcaption className="text-muted-foreground flex items-center gap-2 text-sm">
        <span aria-hidden className={series === "views" ? "bg-series-views size-2 rounded-full" : "bg-series-inquiries size-2 rounded-full"} />
        {title}
      </figcaption>
      <ChartContainer config={seriesConfig} className="aspect-auto w-full" style={{ height: Math.max(96, rows.length * 36) }}>
        <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 16 }} barCategoryGap="30%">
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={112} tickLine={false} axisLine={false} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar dataKey="value" name={seriesConfig[series].label} fill={`var(--color-${series})`} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}><th scope="row">{r.name}</th><td>{r.value}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Views area on top, inquiries bars underneath, sharing one x-axis via syncId. */
export function TrendCharts({ points }: { points: TrendBucket[] }) {
  return (
    <div className="space-y-1">
      <ChartContainer config={seriesConfig} className="aspect-auto h-44 w-full">
        <AreaChart data={points} syncId="pet-trend" margin={{ left: 0, right: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" hide />
          <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
          <Area dataKey="views" type="monotone" stroke="var(--color-views)" strokeWidth={2} fill="var(--color-views)" fillOpacity={0.12} />
        </AreaChart>
      </ChartContainer>
      <ChartContainer config={seriesConfig} className="aspect-auto h-20 w-full">
        <BarChart data={points} syncId="pet-trend" margin={{ left: 0, right: 8 }}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tickFormatter={shortDate} />
          <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="inquiries" fill="var(--color-inquiries)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function shortDate(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? day : d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}
```

### 4e. `AnalyticsView.tsx` restructure

Keep the props and the adopted banner/empty-state logic. Then:

- **Stat tiles:** keep the three, but give each label a colored dot (views blue, inquiries orange, conversion none). The numbers stay `text-foreground`.
- **Channels card:** `grid gap-6 md:grid-cols-2` with two `ChannelBarChart`s (Views by channel, Inquiries by channel). Both use the **same row order**, sorted by views desc, so a channel sits on the same line in both. Delete the hand-drawn `ChannelBars` and fix the oversized label text.
- **Links card:** keep the table, right-align the numeric columns, use `tabular-nums`, and drop the extra blank spacing.
- **Top cities:** a ranked list where each row is a name, a thin blue bar (`bg-series-views`, width = views / max), and the number in text color.
- **Trend card:** full opacity (drop `opacity-80`). Title `{grain === "week" ? "Views and inquiries by week" : "Views and inquiries by day"}`, with a tiny legend under the title (blue dot Views, orange dot Inquiries), then `<TrendCharts points={trend.points} />` using `bucketTrend(analytics.viewsByDay, analytics.inquiriesByDay)`.
- Delete `ViewsLine`.

Update `test/web/unit/AnalyticsView.test.tsx`: the "Views by week" expectation becomes "Views and inquiries by week". Add one assertion that the channel sr-only tables contain the channel names.

### 4f. Range control

Keep the three buttons. Since switching is now instant, add `aria-pressed` and show the active range in the stat-tile captions ("Views · last 7 days"). No other changes.

**⏸ CHECKPOINT 4** — `npm run ci`. Then manually check a seeded pet: load once, toggle 7d/30d/All rapidly (no skeleton, no network calls after the first three in devtools), in light and dark, desktop and 375px. Summary plus a screenshot description, then wait. Suggested commit: `Rebuild pet analytics with real charts and prefetched ranges.`

---

## CP5 — owner analytics widget  (~45 min)

File: `client/pages/pets/OwnerAnalyticsWidget.tsx` (rendered today by `PetBioSidebar`; plan 3 moves it into the owner hero). Build it to look good in **both** a ~20rem sidebar and a full-width hero using container queries (Tailwind v4 has them built in).

### 5a. Helpers — append to `present.ts`

```ts
/** Zero-filled values for the last `days` UTC days ending today, oldest → newest. */
export function lastNDays<T extends { day: string }>(
  points: T[],
  pick: (p: T) => number,
  days: number,
  today = new Date(),
): number[] {
  const byDay = new Map(points.map((p) => [p.day, pick(p)]));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    out.push(byDay.get(d.toISOString().slice(0, 10)) ?? 0);
  }
  return out;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/** Feel-good framing: increases celebrated, decreases stated neutrally, never red. */
export function weekOverWeekCopy(current: number, previous: number): string | null {
  if (previous === 0) return current > 0 ? "New this week" : null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct >= 5) return `↑ ${pct}% vs last week`;
  if (pct <= -5) return "Quieter than last week";
  return "Steady with last week";
}
```

The 7-day window matches the API's `7d` ("today and the previous 6 days").

### 5b. Data — read the analytics page's cache

Replace the summary query with the two keys CP4 already uses, so the queries are shared and rendering the widget pre-warms the analytics page:

```ts
const d30 = useQuery({
  queryKey: ["pet-analytics", petId, "30d"],
  staleTime: 60_000,
  queryFn: async () => fetchPetAnalytics((await getAccessToken()) ?? "", petId, "30d"),
});
const d7 = useQuery({
  queryKey: ["pet-analytics", petId, "7d"],
  staleTime: 60_000,
  queryFn: async () => fetchPetAnalytics((await getAccessToken()) ?? "", petId, "7d"),
});

const views14 = lastNDays(d30.data?.viewsByDay ?? [], (p) => p.views, 14);
const inq14 = lastNDays(d30.data?.inquiriesByDay ?? [], (p) => p.inquiries, 14);
const views7 = views14.slice(7);
const inq7 = inq14.slice(7);
const top = d7.data?.byChannel[0] ?? null; // already sorted by views desc
const topShare = top && d7.data!.funnel.views > 0 ? Math.round((top.views / d7.data!.funnel.views) * 100) : null;
```

Leave `fetchPetAnalyticsSummary` in `petInsightsApi.ts` with a comment: `// Unused since 5a-owner-widget; endpoint removed in slice 5b.`

### 5c. Layout

```tsx
<Card className="@container">
  <CardHeader> {/* keep <OwnerOnlyLabel /> for now — plan 3 removes it with the shell */}
    <CardTitle>{petName} this week</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* adopted → "Final results — {petName} was adopted 🎉", tiles stay, no week-over-week copy */}
    {/* empty (30d views + inquiries both 0) → "No visits yet. Share {petName}'s link to start seeing views here." + Manage links button, no tiles */}
    <div className="grid gap-3 @lg:grid-cols-3">
      <Tile dot="bg-series-views" label="Views" value={sum(views7)} delta={weekOverWeekCopy(sum(views7), sum(views14.slice(0, 7)))}>
        <Sparkline values={views7} series="views" label={`Views per day, last 7 days`} />
      </Tile>
      <Tile dot="bg-series-inquiries" label="Inquiries" value={sum(inq7)} delta={weekOverWeekCopy(sum(inq7), sum(inq14.slice(0, 7)))}>
        <Sparkline values={inq7} series="inquiries" label={`Inquiries per day, last 7 days`} />
      </Tile>
      <Tile label="Top channel" value={top ? channelDisplayName(top.channelKey, channels.data ?? []) : "—"}
            delta={topShare != null ? `${topShare}% of views` : null} />
    </div>
    <div className="flex flex-wrap gap-2">
      <Link href={analyticsHref} className={buttonVariants({ size: "sm" })}>View analytics</Link>
      <Link href={linksHref} className={buttonVariants({ variant: "outline", size: "sm" })}>Manage links</Link>
    </div>
  </CardContent>
</Card>
```

`Tile`: a muted rounded box with the label row (colored dot when given, `text-muted-foreground text-xs`), the value (`text-2xl font-semibold tabular-nums text-foreground`), optional children, then the delta (`text-muted-foreground text-xs`). The "↑" copy may use `text-foreground`; nothing uses red. While loading, render three `bg-muted animate-pulse` boxes in the grid, not "—".

The links stay `<Link>` elements styled as buttons, so `PetBioSidebar`'s "View analytics" link-role test keeps passing.

### 5d. Tests

- `test/web/unit/weekOverWeek.test.ts`: `lastNDays` zero-fills and orders with a fixed `today`; `weekOverWeekCopy` covers new, up, steady, quieter, and both zero → null.
- `test/web/unit/OwnerAnalyticsWidgetTiles.test.tsx`: `vi.mock("@client/features/petInsights/petInsightsApi")` returning fixtures for `fetchPetAnalytics` / `fetchChannels`, and `vi.mock("@client/auth")` with `authSignedIn()` from `support/renderWithProviders`. Follow the mocking style already used in `LinksManager.test.tsx`. Assert three cases: tiles with totals and "↑ …" copy; empty state with no tiles; adopted banner with no delta copy.
- Keep `OwnerAnalyticsWidget.test.tsx` (the sidebar gating test) passing unchanged.

**⏸ CHECKPOINT 5** — `npm run ci`. Manually: owner pet bio in light and dark, sidebar width and 375px, then click "View analytics" and confirm it opens with no skeleton (cache pre-warmed). Summary + wait. Suggested commit: `Turn the owner analytics card into tiles with sparklines and week-over-week trends.`

---

## 🛑 End of session — hand back to the user

After CP5 is approved, **stop**. Don't start the inbox. Post exactly this, filled in:

> **Plan 1 done (through CP5).** Committed checkpoints: CP0–CP5 (or list what's left). Deviations from the plan: … Open issues: … Context is getting heavy, so please start a **new session** for plan 2 (inbox) and report back here with how far this one got.

If context gets tight **before** CP5, stop at the last clean checkpoint and post the same message, listing which checkpoints are done.
