# `apps/api/infrastructure/` — Infrastructure

## Purpose

**Repository implementations**, **seed/bootstrap** loaders, and the **`Container`** composition root.

## Rules

- Implement interfaces from `apps/api/domain/repositories/`.
- External service calls must go through infrastructure adapters (for example, `adapters/supabase/SupabaseAdapter.ts`) so repositories remain persistence-focused and client libraries stay swappable.
- `Container` is a thin composition root. Domain wiring lives in `infrastructure/composition/*` modules; add a module and delegate getters rather than growing `container.ts` ad hoc.
- External HTTP to PostgREST goes through `DataAdapter` (`getWithCount`, `rpc`, `insertReturning` included).

## Bootstrap

Optional seed data loading lives here (e.g. `seed.ts`). Production apps often replace in-memory repos with DB-backed adapters registered the same way on `Container`.

## Cursor

The **infra expert** rule (`.cursor/rules/infra-expert.mdc`) applies when editing under `apps/api/infrastructure/`, `apps/api/config/`, or root `seed.json`.
