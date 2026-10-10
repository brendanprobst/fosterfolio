export const notificationKeys = {
  all: ["notifications"] as const,
  list: (status: "unread" | "all" | "archived") => ["notifications", "list", status] as const,
  lists: ["notifications", "list"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};
