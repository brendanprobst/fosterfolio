# `client/features/pets/` — Pet feature (Query)

## Split

| File | Role |
|------|------|
| **`petsApi.ts`** | Public `GET /pets/:id` via `publicApiRequest`. |
| **`petsKeys.ts`** | TanStack Query key factory. |
| **`usePet.ts`** | Detail query for the public bio page. |
| **`types.ts`** | Client DTO mirror of the API public pet projection. |

## Conventions

- The bio page is **one unauthenticated call** (`fetchPetById`). Do not assemble the page from multiple endpoints.
- Auth mutations (create/update/delete) land in later checkpoints; keep them in this folder when added.
- Follow the same shape as **`client/features/things/`** for new entities.
