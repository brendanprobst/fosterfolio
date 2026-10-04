# `client/features/users/` — User profiles (Query)

## Split

| File | Role |
|------|------|
| **`usersApi.ts`** | Public `GET /users/:id`; authenticated GET (owner DTO) and `PUT`. |
| **`usersKeys.ts`** | TanStack Query key factory. |
| **`useUser.ts`** | Public profile query. |
| **`useOwnUser.ts`** | Owner GET + update mutation. |
| **`types.ts`** | Client DTO mirror of public/owner user projections. |

Public profile pages must use **`fetchUserById`** (no auth header) so private fields never land in that view.
