---
name: v2 slice 5a — implementation plan 3 of 3 (owner/guest/profile layouts)
overview: Third implementation session for docs/plans/v2_slice5a_ux_polish.plan.md. Covers 5a-owner-shell, 5a-guest-bio, 5a-profile. Plans 1 (quick wins + analytics) and 2 (inbox) come first. Ends slice 5a; slice 5b (foster-me links) follows.
status: completed
todos:
  - id: cp0
    content: "CP0 — OwnerPageLayout shell + split PetFacts into header/details parts"
    status: completed
  - id: cp1
    content: "CP1 — guest pet bio: single column, facts below bio, floating inquiry CTA → Sheet"
    status: completed
  - id: cp2
    content: "CP2 — owner pet bio: admin hero + public preview; drop the sidebar and the 'visible only to you' labels"
    status: completed
  - id: cp3
    content: "CP3 — /profile on the owner shell: Add pet in hero, active fosters above the fold, past fosters below"
    status: completed
  - id: cp4
    content: "CP4 — close out slice 5a: dead code, todo.md, parent plan"
    status: completed
---

# Slice 5a — implementation plan 3 of 3: layouts

Parent plan: [`v2_slice5a_ux_polish.plan.md`](v2_slice5a_ux_polish.plan.md), tickets **5a-owner-shell**, **5a-guest-bio**, **5a-profile**. Plans 1–2 must be done first: plan 1's `OwnerAnalyticsWidget` (tiles), `QrDownloadMenu`, and charts are used here.

## How to run this session (read first)

- **Checkpoint by checkpoint, in order.** At every **⏸ CHECKPOINT**: run the verify commands, **stop**, post a short review summary (files touched, tests changed, surprises, deviations and why), and **wait for "go"**. The user commits. **Never `git commit` / `push` / `stash`.**
- After each approved checkpoint, flip its `status` here. Flip parent-plan tickets and todo.md §7 lines as noted per checkpoint.
- Code below is the intended shape against the repo as of 2026-10-09. Adapt small signature drift without asking; ask only if a decision is wrong.
- Fast loop: `npm run test:web:unit -- <file>`. Checkpoint gate: `npm run ci`. E2E for CP1/CP2: `npx playwright test --config test/web/playwright.config.ts product` (ports 3000/3001 free).
- **Known red, do not fix:** the 3 `test/web/unit/SearchPage.test.tsx` tests (their `next/navigation` mock lacks `usePathname`). Report "green except the 3 known-red SearchPage tests". Any other failure is yours.
- **Foster-me is out of scope.** `FosterMePage` keeps rendering `PetBioView` + its sidebar. Slice 5b replaces it. It will pick up CP1's facts-below-bio reorder because it shares `PetBioView`; that's fine. Don't give it the floating CTA.
- **Context budget:** this is the heaviest of the three plans. After **CP2**, assess your context. If it's getting heavy, stop there and hand back (see the end of the file) rather than starting CP3.

---

## CP0 — shell + PetFacts split (~25 min)

### 0a. `client/components/layout/OwnerPageLayout.tsx`

App-agnostic (no feature/page imports). It's the structural owner/public split that replaces every "Visible only to you" label.

```tsx
"use client";

import { cn } from "@client/lib/utils";
import { ArrowDown, Eye } from "lucide-react";
import type { ReactNode } from "react";

type OwnerPageLayoutProps = {
	/** Owner-only tools. Rendered in a tinted band. */
	hero: ReactNode;
	/** What visitors see. Omit for owner-only pages (e.g. /profile). */
	preview?: ReactNode;
	previewLabel?: string;
	/** Pet bio wants the preview below the fold; /profile does not. */
	fillFold?: boolean;
};

export function OwnerPageLayout({
	hero,
	preview,
	previewLabel = "Public preview — this is what visitors see",
	fillFold = false,
}: OwnerPageLayoutProps) {
	return (
		<div className="space-y-10 pb-16">
			<section
				aria-label="Your tools"
				className={cn(
					"bg-muted/60 border-b",
					fillFold && "flex min-h-[calc(100dvh-4rem)] flex-col", // 4rem ≈ AppHeader height; adjust if different
				)}>
				<div
					className={cn(
						"mx-auto w-full max-w-5xl px-4 py-6 md:py-10",
						fillFold && "flex flex-1 flex-col",
					)}>
					<div className={cn(fillFold && "flex-1")}>{hero}</div>
					{preview && fillFold ? (
						<a
							href="#public-preview"
							className="text-muted-foreground hover:text-foreground mt-6 inline-flex items-center gap-1 self-center text-sm">
							See your public page <ArrowDown aria-hidden className="size-4" />
						</a>
					) : null}
				</div>
			</section>
			{preview ? (
				<section
					id="public-preview"
					aria-label="Public preview"
					className="mx-auto w-full max-w-5xl px-4">
					<div className="text-muted-foreground mb-6 flex items-center gap-3 text-xs font-medium tracking-wide uppercase">
						<span aria-hidden className="bg-border h-px flex-1" />
						<Eye aria-hidden className="size-3.5" />
						{previewLabel}
						<span aria-hidden className="bg-border h-px flex-1" />
					</div>
					{preview}
				</section>
			) : null}
		</div>
	);
}
```

Export it from `client/components/layout/index.ts`. Check the real `AppHeader` height and fix the `4rem` if needed.

### 0b. Split `PetFacts` — `client/components/PetFacts.tsx`

The guest bio needs name + status at the top and the details (age/weight/sex/species/breed) **below** the bio. Add a `part` prop instead of duplicating markup:

```ts
type PetFactsProps = {
	pet: PetFactsPet;
	title?: ReactNode; // required when part !== "details"
	showSpecies?: boolean;
	/** "all" (default, today's behavior) | "header" (title + status badges) | "details" (age/weight/sex + species/breed). */
	part?: "all" | "header" | "details";
};
```

Wrap the existing title/badges row in `part !== "details"` and the details list + species/breed in `part !== "header"`. The default `"all"` keeps `PetCard` and every other caller unchanged.

Tests: extend `test/web/unit/PetBioView.test.tsx` or add `PetFacts.test.tsx`. `part="header"` has no `aria-label="Details"` list; `part="details"` has no title.

**⏸ CHECKPOINT 0** — `npm run ci` (known red only). Summary + wait. Suggested commit: `Add the owner page shell and let PetFacts render header and details separately.`

---

## CP1 — guest pet bio (~60 min)

### 1a. Order — `client/pages/pets/PetBioView.tsx`

Single column. New order: **gallery → name + status (`PetFacts part="header"`) → bio → "About {name}" (`PetFacts part="details"` under an `h2`) → shelter line → links → updates.** Keep `setDocumentTitle`. Add one optional prop:

```ts
/** Rendered after the details (guest page passes the foster card here). */
afterDetails?: ReactNode;
```

### 1b. `client/hooks/useMediaQuery.ts`

The folder may not exist yet. `components.json` already aliases `@client/hooks`.

```ts
"use client";
import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		(onChange) => {
			if (
				typeof window === "undefined" ||
				typeof window.matchMedia !== "function"
			)
				return () => {};
			const mql = window.matchMedia(query);
			mql.addEventListener("change", onChange);
			return () => mql.removeEventListener("change", onChange);
		},
		() =>
			typeof window !== "undefined" &&
			typeof window.matchMedia === "function" &&
			window.matchMedia(query).matches,
		() => false,
	);
}
```

### 1c. `client/features/inquiries/InquiryCta.tsx`

Floating button → Sheet that hosts the **existing** `InquiryForm`, then `InquirySuccess` (which carries the "How did you hear…" prompt, so the success view must stay inside the sheet).

```tsx
"use client";

import { Button } from "@client/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@client/components/ui/sheet";
import { useMediaQuery } from "@client/hooks/useMediaQuery";
import { capturePetEvent } from "@client/lib/analytics/initFosterfolioAnalytics";
import { Check, MessageCircle } from "lucide-react";
import { useRef, useState } from "react";
import { InquiryForm, InquirySuccess, type InquiryDraft } from "./InquiryForm";
import type { Inquiry } from "./types";

const EMPTY: InquiryDraft = {
	senderName: "",
	senderEmail: "",
	message: "",
	zipCode: "",
};

type InquiryCtaProps = {
	targetUserId: string;
	targetPetId: string;
	petName: string;
	fosterName?: string;
	capturePetEvents?: boolean;
	/** Owner preview: static, disabled, not floating. */
	preview?: boolean;
};

export function InquiryCta({
	targetUserId,
	targetPetId,
	petName,
	fosterName,
	capturePetEvents = false,
	preview = false,
}: InquiryCtaProps) {
	const [open, setOpen] = useState(false);
	const [sent, setSent] = useState<Inquiry | null>(null);
	const [draft, setDraft] = useState<InquiryDraft>(EMPTY);
	const desktop = useMediaQuery("(min-width: 1024px)");
	const captured = useRef(false);
	const label = `Ask about ${petName}`;

	if (preview) {
		return (
			<div className="border-border space-y-1 rounded-xl border border-dashed p-4 text-center">
				<Button type="button" size="lg" className="rounded-full" disabled>
					<MessageCircle aria-hidden /> {label}
				</Button>
				<p className="text-muted-foreground text-xs">
					Visitors see this button floating at the bottom of the page.
				</p>
			</div>
		);
	}

	function openSheet() {
		setOpen(true);
		if (capturePetEvents && !captured.current) {
			captured.current = true;
			void capturePetEvent("inquiry_form_opened", {
				id: targetPetId,
				ownerId: targetUserId,
			});
		}
	}

	return (
		<>
			{!open ? (
				<div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:justify-end lg:pr-8">
					{sent ? (
						<Button
							type="button"
							variant="secondary"
							className="pointer-events-auto rounded-full shadow-md"
							onClick={() => setOpen(true)}>
							<Check aria-hidden /> Inquiry sent
						</Button>
					) : (
						<Button
							type="button"
							size="lg"
							className="pointer-events-auto rounded-full shadow-lg"
							onClick={openSheet}>
							<MessageCircle aria-hidden /> {label}
						</Button>
					)}
				</div>
			) : null}
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent
					side={desktop ? "right" : "bottom"}
					className="max-h-[90dvh] overflow-y-auto data-[side=right]:sm:max-w-md">
					<SheetHeader>
						<SheetTitle>{label}</SheetTitle>
						<SheetDescription>
							{fosterName || "The foster"} will get your message by email.
						</SheetDescription>
					</SheetHeader>
					<div className="px-4 pb-6">
						{sent ? (
							<InquirySuccess
								fosterName={fosterName}
								petName={petName}
								inquiry={sent}
							/>
						) : (
							<InquiryForm
								targetUserId={targetUserId}
								targetPetId={targetPetId}
								heading="Contact the foster" /* keeps the form's accessible name for existing e2e selectors */
								showHeading={false}
								draft={draft}
								onDraftChange={setDraft}
								fosterName={fosterName}
								petName={petName}
								capturePetEvents={capturePetEvents}
								onSuccess={setSent}
							/>
						)}
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
```

Export it from `features/inquiries/index.ts`. Check the `InquiryForm` prop names against the file; they were `targetUserId, targetPetId, heading, showHeading, draft, onDraftChange, fosterName, petName, capturePetEvents, onSuccess` on 2026-10-09.

### 1d. Guest branch of `client/pages/pets/PetBioPage.tsx`

Guests no longer use `PageWithSidebar`:

```tsx
{
	pet && !isOwner ? (
		<div className="mx-auto max-w-3xl space-y-8 px-4 py-8 pb-28">
			<PetBioView
				pet={pet}
				afterDetails={
					<FosterStatusCard
						petName={pet.name}
						ownerRef={ownerRef}
						ownerName={pet.owner?.displayName || "Foster"}
						ownerAvatarUrl={pet.owner?.avatarUrl ?? null}
						mode="permalink"
						isCurrentFoster={pet.status === "actively_fostering"}
					/>
				}
			/>
			{pet.status !== "adopted" ? (
				<InquiryCta
					targetUserId={pet.ownerId}
					targetPetId={pet.id}
					petName={pet.name}
					fosterName={pet.owner?.displayName || "Foster"}
					capturePetEvents={capturePetEvents}
				/>
			) : null}
		</div>
	) : null;
}
```

`pb-28` keeps the floating button from covering the last content. The owner branch stays on the old sidebar until CP2.

### 1e. Tests

- `test/web/unit/PetBioPage.test.tsx` — rework the guest tests:
  - The guest sees "Ask about {name}". Clicking it opens a dialog with the "Contact the foster" form.
  - The "expands into a modal and keeps in-progress values" test becomes: type in the sheet, close it, reopen it, and the draft is still there.
  - No CTA when the pet is adopted.
  - `inquiry_form_opened` fires once on open (mock `capturePetEvent`).
  - The "warns when no longer the active foster" test should still pass via `FosterStatusCard` in `afterDetails`.
- `test/web/unit/PageWithSidebar.test.tsx` — the "inquiry form in the side panel" block targets the pet bio guest sidebar. If it renders `PetBioPage`, retarget it to foster-me (still sidebar-based) or delete it with a note. `petSidebarMobileSummary` tests stay (foster-me uses it).
- `test/web/e2e/product.spec.ts` — update the **pet-bio** guest specs only:
  - "pet bio shows foster status and inquiry without a QR"
  - "inquiry form on the bio page shows success after submit"
  - "expanding the bio inquiry keeps a draft…"
  - "pet bio inquiry can be sent from the side panel"

  Each now clicks `Ask about {E2E_SEED.petName}` and works inside `page.getByRole("dialog")`. The form's accessible name is still "Contact the foster". **Leave the public-profile and foster-me inquiry specs alone.**

**⏸ CHECKPOINT 1** — `npm run ci` (known red only) plus the `product` Playwright spec. Manual check at 375px and desktop, light and dark: the button floats above the iOS-style bottom inset, the sheet slides up on mobile and in from the right on desktop, success shows inside the sheet, and the button then becomes "Inquiry sent". Summary + wait. Afterwards tick `5a-guest-bio` in the parent plan and todo §7. Suggested commit: `Put the pet story first and float the inquiry button for visitors.`

---

## CP2 — owner pet bio (~50 min)

### 2a. `client/pages/pets/OwnerPetHero.tsx`

```tsx
"use client";

import { PetFacts } from "@client/components/PetFacts";
import { QrDownloadMenu } from "@client/components/qr";
import { buttonVariants } from "@client/components/ui/button";
import type { PetPublic } from "@client/features/pets";
import { petEditorEditHref } from "@client/lib/petEditorPath";
import { cn } from "@client/lib/utils";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { CopyLinkButton } from "./CopyLinkButton"; // extract from ShareLinkCard's copy logic if no shared one exists
import { OwnerAnalyticsWidget } from "./OwnerAnalyticsWidget";

export function OwnerPetHero({
	pet,
	ownerRef,
	petPath,
}: {
	pet: PetPublic;
	ownerRef: string;
	petPath: string;
}) {
	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<PetFacts
					pet={pet}
					part="header"
					title={
						<h1 className="text-3xl font-semibold tracking-tight">
							{pet.name}
						</h1>
					}
				/>
				<div className="flex flex-wrap gap-2">
					<Link
						href={petEditorEditHref(pet.id, petPath)}
						className={cn(buttonVariants())}>
						<Pencil aria-hidden /> Edit bio
					</Link>
					<CopyLinkButton path={petPath} />
					<QrDownloadMenu
						url={absoluteUrl(petPath)}
						filenameBase={pet.name}
						triggerLabel="QR code"
					/>
				</div>
			</div>
			<OwnerAnalyticsWidget
				petId={pet.id}
				petName={pet.name}
				ownerRef={ownerRef}
				adopted={pet.status === "adopted"}
			/>
		</div>
	);
}
```

`absoluteUrl(path)` is `${window.location.origin}${path}`, guarded for SSR. Put it next to `QrDownloadMenu`'s usage or in `client/lib`. Keep the "Edit bio" link name and its `href` shape; the owner e2e spec asserts both.

### 2b. Owner branch of `PetBioPage.tsx`

```tsx
{pet && isOwner ? (
  <OwnerPageLayout
    fillFold
    hero={<OwnerPetHero pet={pet} ownerRef={ownerRef} petPath={petHref(ownerRef, pet.id)} />}
    preview={
      <div className="mx-auto max-w-3xl space-y-8">
        <PetBioView pet={pet} afterDetails={<FosterStatusCard … />} />
        {pet.status !== "adopted" ? (
          <InquiryCta preview targetUserId={pet.ownerId} targetPetId={pet.id} petName={pet.name} />
        ) : null}
      </div>
    }
  />
) : null}
```

Guests must never receive hero markup. The branch is render-gated by `isOwner`, not CSS. Owner views don't capture analytics (already true via `capturePetEvents`).

### 2c. Remove the labels and the dead sidebar

- `OwnerAnalyticsWidget.tsx` — drop `<OwnerOnlyLabel />`.
- `EditPetBioCard.tsx`, `ShareLinkCard.tsx` — drop `<OwnerOnlyLabel />`. They're still used on the **foster-me** owner sidebar; the parent ticket removes labels there too.
- `PetBioSidebar.tsx` — now unused. Delete it after grepping.
- `test/web/unit/OwnerAnalyticsWidget.test.tsx` gates the sidebar. Move its two intents into `PetBioPage.test.tsx`: a guest/other visitor never sees "View analytics" or the hero, and the owner sees the hero with "View analytics". Then delete the old file.
- Leave `OwnerOnlyLabel` itself and its use in `PublicProfileSidebar` (public profile is out of scope). Note it in the summary.

### 2d. Tests

- `PetBioPage.test.tsx`:
  - The owner sees the "Your tools" region, the "Public preview" divider text, "Edit bio", and a disabled "Ask about …" button.
  - The "lets the owning foster generate a pet QR on demand" test now targets the hero's "QR code" menu trigger.
  - No `OwnerOnlyLabel` text ("Visible only to you") appears anywhere on the owner page.
- `product.spec.ts` "owner sees analytics links instead of the pet-bio QR card" — update:
  - Drop the `Edit {name}'s bio` text assertion (that card is gone on this page).
  - Keep the "Edit bio" `href` and "Manage links" assertions.
  - "send inquiry" buttons are still count 0 (the preview button is "Ask about…" and disabled).
  - The old "QR code" **button** assertion is now wrong, because the hero has a "QR code" menu trigger. Assert it's visible instead.

**⏸ CHECKPOINT 2** — `npm run ci` (known red only) plus `product` Playwright. Manual check at desktop and 375px, light and dark: the hero fills the first screen, "See your public page ↓" scrolls to the divider, and the preview matches what a guest sees except for the disabled button. Summary + wait. Afterwards tick `5a-owner-shell` in the parent plan and todo §7. Suggested commit: `Give owners an admin hero above a public preview of their pet's page.`

**🧭 Context check:** if your context is heavy now, stop here and use the hand-back message at the end, listing CP3–CP4 as remaining.

---

## CP3 — /profile on the owner shell (~40 min)

File: `client/pages/profile/ProfilePage.tsx`. No public preview here: `OwnerPageLayout` without `preview` and **without** `fillFold`. The active pets must be above the fold.

### 3a. Structure

```tsx
const active = petList.filter((p) => p.status === "actively_fostering");
const past = petList.filter((p) => p.status !== "actively_fostering");

<OwnerPageLayout
	hero={
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
			{/* identity: keep today's header markup (avatar, name + edit pencil, handle line, BioPreview) */}
			<div className="space-y-4">
				{identityHeader}
				<Link
					href={petEditorNewHref()}
					className={cn(buttonVariants({ size: "lg" }))}>
					<Plus aria-hidden /> Add pet
				</Link>
			</div>
			{/* share card: beside identity on desktop; on mobile it moves below active fosters (see 3b) */}
			<div className="hidden lg:block">
				<ProfileLinkCard
					handleOrId={shareRef}
					hasHandle={Boolean(profile?.handle)}
				/>
			</div>
		</div>
	}
/>;
```

Below the layout's hero, inside the same page column (`mx-auto max-w-5xl px-4 space-y-10`):

1. **Currently fostering**: compact `PetCard`s, `grid gap-3 grid-cols-2 lg:grid-cols-3`. If there are no active pets but there are past ones, show a one-line nudge with the Add pet link. If there are no pets at all, show the existing `PetsEmptyState` here instead.
2. **Mobile only** (`lg:hidden`): `ProfileLinkCard`.
3. **Your details**: the existing `ProfileLocationCard` + `ConnectedSitesCard` grid, unchanged.
4. **Past fosters**: `PetCard` grid for every non-active pet, each with its Edit action as today.

Drop `PageWithSidebar` and its `mobileSummary` from this page. Keep all three dialogs. The hero's Add pet replaces the old "Your pets" header button. On a 375px screen the hero must stay compact: avatar `lg` (not `xl`) below `sm`, and the bio stays in `BioPreview` (it clamps).

### 3b. Above-the-fold check

At 375×667, the first active pet card's top edge must be visible without scrolling, for a seeded owner with a 2-line bio. If it isn't, shrink spacing in the hero before reaching for anything else.

### 3c. Tests — `test/web/unit/ProfilePage.test.tsx`

- "leads with the identity header and shares public URLs from one sidebar card": the share card now lives in the hero (desktop) or below active pets (mobile). jsdom renders both trees with CSS-hidden classes, so assert with `getAllBy…`, or query within the "Your tools" region.
- New test: active and past pets render in separate labeled sections, in that order, and "Add pet" is in the hero.
- The empty-state test still passes (`PetsEmptyState` moves under "Currently fostering").
- The skeleton test is unchanged (`variant="profile"` is correct here).

**⏸ CHECKPOINT 3** — `npm run ci` (known red only). Manual check at 375px and desktop, light and dark. Summary + wait. Afterwards tick `5a-profile` in the parent plan and todo §7. Suggested commit: `Lead the profile with Add pet and current fosters, past fosters below.`

---

## CP4 — close out slice 5a (~15 min)

- `grep -rn "PetBioSidebar\|bucketViewsByDay\|fetchPetAnalyticsSummary"`. The first two should be gone; the last stays with its "removed in 5b" comment.
- `client/components/AGENTS.md`: add three lines naming `inbox/`, `charts/`, `qr/`, and `layout/OwnerPageLayout` as **harvestable** (no feature/page imports, enforced by ESLint for the first three).
- Parent plan: set `status: completed` once every ticket is complete.
- `docs/plans/todo.md` §7: everything ticked, plus one line: `Slice 5a complete — next: [slice 5b](v2_slice5b_foster_me_links.plan.md) (implementation plans to be written).`
- There are known-red SearchPage tests that are failing because it was temporarily removed from scope. These tests should be skipped until the search page is brought back into the product.

**⏸ CHECKPOINT 4** — `npm run ci` (known red only). Summary + wait. Suggested commit: `Close out slice 5a.`

---

## 🛑 End of session

Stop after CP4, or earlier at a clean checkpoint if context is heavy. Post:

> **Plan 3 status:** approved checkpoints … / remaining … Known red unchanged: the 3 SearchPage tests. Deviations: … Next: start a **new session**. If CPs remain, continue this plan from the first pending checkpoint; otherwise ask the planner for the slice 5b implementation plans.
