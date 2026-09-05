export const petsKeys = {
  all: ["pets"] as const,
  detail: (id: string) => [...petsKeys.all, "detail", id] as const,
  byOwner: (ownerId: string) => [...petsKeys.all, "owner", ownerId] as const,
};
