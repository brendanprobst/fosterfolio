# `client/components/` — Shared UI building blocks

## Layout

- **`ui/`** — **Design-system primitives** from shadcn/ui (Base UI). Generated/maintained via `npx shadcn@latest add …`. Do not mix route-specific or marketing-only layouts in this folder.
- **Dialog width** — `DialogContent` defaults to **`max-w-2xl`**. Keep that for edit/forms. See [`docs/ui-and-styling.md`](../../docs/ui-and-styling.md) **Product UX**.
- **No page shells here** — route-level views live under **`client/pages/<route>/`** (see [`../pages/AGENTS.md`](../pages/AGENTS.md)).

## Imports

```ts
import { Button } from "@client/components/ui/button";
```

## Harvestable

- **`inbox/`**, **`charts/`**, **`qr/`**, and **`markdown/`** are harvestable. They take data through props. ESLint blocks `@client/features` and `@client/pages` imports in those folders.
- **`markdown/`** — `Markdown` renders stored markdown; `MarkdownEditor` is a Tiptap rich-text editor (formatted while typing) that reads/writes the same markdown, with a title / subtitle / bold / italic / underline / bullet toolbar (`toolbarPosition` top or bottom). Underline is stored as `<u>…</u>` (`markdownExtensions` writes it, `remarkUnderline` renders it); other raw HTML stays off.
- **`layout/OwnerPageLayout`** is harvestable the same way: a structural shell with no feature or page imports.
- Keep new harvestable modules free of Fosterfolio nouns so a later app can copy them as-is.

## Scaling

- **Feature-specific composed widgets** (e.g. the pet list used on multiple routes): prefer **`client/features/<name>/`** when you introduce it; keep **`components/ui/`** generic.
- **Icons:** `lucide-react` next to components that use them.
