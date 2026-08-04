export const petsKeys = {
  all: ["pets"] as const,
  detail: (id: string) => [...petsKeys.all, "detail", id] as const,
};
