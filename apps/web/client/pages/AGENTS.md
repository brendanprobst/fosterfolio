# `client/pages/` — Route-level views

## Purpose

**Full-page UI** wired from Next **`app/`** routes. One folder per logical page; **`index.ts`** re-exports the public entry so imports stay short (`@client/pages/home`).

## Conventions

| Folder        | Route | Notes |
|---------------|-------|--------|
| **`home/`**   | `/`   | Public chronological feed + composer when signed in. |
| **`pets/`**   | `/@handle/pet/[petId]` | Public pet bio; pet id from pathname (handle is decorative). Static-export sentinel + CloudFront `@` rewrite. |
| **`users/`**  | `/@handle`, `/@handle/foster-me` | Public foster profile and stable current-foster pointer. Same sentinel + CloudFront rewrite pattern. |
| **`search/`** | `/search` | Name search across pets and users (`?q=`). |
| **`ui-gallery/`** | `/ui` | Design-system smoke / QA (not product UI). |
| **`auth/`** | `/auth/*` | Supabase sign-in, sign-up, forgot-password, reset-password (wired from **`app/auth/`**). |
| **`profile/`** | `/profile` | Auth-only editor (picture + profile + pets). Public view is **`/@handle`** and stays read-only. |

- **Do not** put shadcn primitives here — those stay in **`client/components/ui/`** (see [`../components/AGENTS.md`](../components/AGENTS.md)).
- **Splitting:** As a page grows, add colocated modules under the same folder (e.g. `home/StepCards.tsx`, `home/constants.ts`) and keep **`HomePage.tsx`** as the thin composer.
- **Features:** Reusable domain modules live under **`client/features/<entity>/`** (API helpers, query keys, hooks). **Zustand** holds entity **UI state** (pagination, selection); **TanStack Query** holds **server** state (see **`client/features/pets/`**).

## Imports

```ts
import { HomePage } from "@client/pages/home";
import { SignInPage } from "@client/pages/auth";
import { UiGalleryPage } from "@client/pages/ui-gallery";
```
