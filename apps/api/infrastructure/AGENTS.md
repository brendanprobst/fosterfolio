# `apps/api/infrastructure/` — Infrastructure

## Purpose

**Repository implementations**, **seed/bootstrap** loaders, and the **`Container`** composition root.

## Rules

- Implement interfaces from `apps/api/domain/repositories/`.
- External service calls must go through infrastructure adapters (for example, `adapters/supabase/SupabaseAdapter.ts`) so repositories remain persistence-focused and client libraries stay swappable.
- `Container` is a thin composition root. Domain wiring lives in `infrastructure/composition/*` modules; add a module and delegate getters rather than growing `container.ts` ad hoc.
- External HTTP to PostgREST goes through `DataAdapter` (`getWithCount`, `rpc`, `insertReturning` included).

## Agent expert

The **infra expert** (`agents/prompts/infra-expert.md`) applies when editing under `apps/api/infrastructure/`, `apps/api/config/`, `apps/web/client/lib/`, or root `seed.json`.
