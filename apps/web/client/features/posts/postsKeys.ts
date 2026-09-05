export const postsKeys = {
  all: ["posts"] as const,
  feed: () => [...postsKeys.all, "feed"] as const,
  byAuthor: (authorId: string) => [...postsKeys.all, "author", authorId] as const,
};
