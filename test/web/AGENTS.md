# `test/web/` — Web unit (Vitest) and E2E (Playwright)

## Unit tests (`test/web/unit/`)

- **Runner:** Vitest + jsdom + React Testing Library.
- **Config:** [`vitest.config.ts`](vitest.config.ts) — `@client/*` → `apps/web/client/*`.
- **Setup:** [`vitest.setup.ts`](vitest.setup.ts) — `jest-dom` matchers, `next/image` mock.
- **Run:** `npm run test:web:unit` (repo root).

## E2E (`test/web/e2e/`)

- **Runner:** Playwright (Chromium in CI).
- **Config:** [`playwright.config.ts`](playwright.config.ts) starts **two** dedicated servers (not the usual `npm run dev` ports):
  - **`@lattice/api`** on **3100** — in-memory repositories + HS256 JWT (`test/web/e2e/support/e2eAuthConstants.ts`).
  - **`@lattice/web`** on **3101** — `NEXT_PUBLIC_LATTICE_E2E=1` and a pre-minted `NEXT_PUBLIC_LATTICE_E2E_ACCESS_TOKEN` (synthetic session; no real Supabase).
- **Specs**
  - **`product.spec.ts`** — Fosterfolio surfaces against the in-memory `LATTICE_E2E` seed. Guest vs signed-in (the JWT user owns the seeded pet): feed, search, pet bio, public profile, foster-me, inquiry + expand, owner QR-on-demand, profile editor.
  - **`auth-guard.spec.ts`** — signs out, then asserts `/profile` redirects to `/auth/sign-in` while `/search` stays public.
  - **`full-stack.spec.ts`** — signed-in `/profile` loads the seeded foster from the API.
  - **`home.spec.ts`**, **`ui-gallery.spec.ts`** — public routes.
- **Auth:** the default session is **signed in** as `E2E_SEED.userId`. Guest tests set `lattice-e2e-signed-out` via `browseAsGuest` (`test/web/e2e/support/e2eSession.ts`).
- **Run:** `npm run test:web:e2e` (install browsers once: `npx playwright install`).
- **Artifacts:** traces, videos, and test output go under **`test/web/test-results/`** (gitignored; **`outputDir`** in `playwright.config.ts`). **`npm run clean`** removes that folder (and caches).
- **Port conflicts:** Playwright uses **3100 / 3101** so a local `npm run dev` on 3000 / 3001 is never reused (that stack is not `LATTICE_E2E`). If 3100 / 3101 are already taken by a non-E2E process, stop it or set `CI=true` so Playwright does not reuse it.

## CI

- Unit tests run in the main **`npm run ci`** pipeline via Turbo.
- E2E runs in a separate workflow job (browser install + Playwright).
