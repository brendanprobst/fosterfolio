# `client/stores/` — Zustand (client UI state)

## Purpose

**Zustand** stores hold **entity-scoped UI state** that is not server truth: pagination, sort preferences, selection, panel open state, etc.

## Conventions

- **Do not** mirror full entity lists in Zustand when the data comes from the API — use **TanStack Query** for cached server state and `invalidateQueries` after mutations.
- One store file per aggregate or screen cluster is fine (e.g. `petsStore.ts` for list pagination).
- Import stores with narrow selectors: `usePetsStore((s) => s.page)` to avoid extra re-renders.

## Current state

No stores yet — Fosterfolio's surfaces read server state through TanStack Query (see **`client/features/pets/`**) and keep the little UI state they need in component state. Add a store here when a screen needs UI state that outlives a single component.
