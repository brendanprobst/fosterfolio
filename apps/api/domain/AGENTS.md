# `apps/api/domain/` — Domain layer

## Purpose

Pure business logic: **entities**, **value objects**, **domain services**, **repository interfaces** (`I*Repository`), and the **`Result` / `ResultError` / `ErrorCatalog`** types.

## Rules

- No imports from `application/`, `infrastructure/`, `controllers/`, or `routes/`.
- Express and I/O types stay out of here.
- Expose behavior on entities; keep use cases thin orchestrators.
- Domain errors live in `domain/errors/catalogs/<Domain>Errors.ts` with HTTP status on each `ResultError`. `ErrorCatalog` re-exports for compatibility.
- Entities that leave the API expose `toPublicDto()` / `toOwnerDto()` (see `application/dtos/AGENTS.md`).

## Reference implementation

**`User`** and **`Pet`** are the product reference aggregates (public vs owner DTOs, ownership checks, soft delete on pets). ADRs under `docs/adr/` describe patterns generically.

## Template slice

Follow **`Pet`** end-to-end when adding a new aggregate: entity → `I*Repository` → in-memory + Supabase adapters → use cases → composition module → controller → routes → Swagger → tests (`test/api/pets.test.ts`).

## Agent expert

The **DDD expert** (`agents/prompts/ddd-expert.md`) applies when editing under `apps/api/domain/`, `apps/api/application/`, or `docs/adr/`.
