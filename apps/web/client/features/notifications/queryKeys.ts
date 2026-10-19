export const notificationKeys = {
  all: ["notifications"] as const,
  list: (status: "unread" | "all" | "archived") => ["notifications", "list", status] as const,
  lists: ["notifications", "list"] as const,
  petList: (petId: string) => ["notifications", "list", "all", { petId }] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};
