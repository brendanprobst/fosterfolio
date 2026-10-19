# `client/features/posts/` — Feed and composer (Query)

## Split

| File | Role |
|------|------|
| **`postsApi.ts`** | Public feed (keyset) + author posts; authenticated create. |
| **`postsKeys.ts`** | TanStack Query key factory. |
| **`useFeed.ts`** | `useInfiniteQuery` for `GET /posts?cursor=&limit=`. |
| **`useCreatePost.ts`** | Composer mutation; invalidates feed, author posts, and the pet's detail. |
| **`PostComposer.tsx`** | Post form used on `/feed` and, locked to one pet via `petId`, in the owner's "Post update" dialog. |
| **`types.ts`** | Client DTO mirror of `PostPublicDto` / `FeedPageDto`. |

Do not switch the feed to offset pagination.
