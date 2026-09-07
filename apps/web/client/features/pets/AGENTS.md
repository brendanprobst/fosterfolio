# `client/features/pets/` — Pet feature (Query)

## Split

| File | Role |
|------|------|
| **`petsApi.ts`** | Public `GET /pets/:id` and `GET /users/:id/pets`; authenticated create/update/delete. |
| **`petsKeys.ts`** | TanStack Query key factory. |
| **`usePet.ts`** | Detail query for the public bio page. |
| **`useOwnerPets.ts`** | Pets listed on a foster profile / composer. |
| **`usePetMutations.ts`** | Owner create/update/delete. |
| **`types.ts`** | Client DTO mirror of the API public pet projection (includes nested `owner`). |

## Conventions

- The bio page is **one unauthenticated call** (`fetchPetById`). Do not assemble the page from multiple endpoints.
- This folder is the reference shape for new entities (API helpers + query keys + hooks).
