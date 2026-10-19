export type InboxEntry = {
  id: string;
  /** Bold line, e.g. sender name. */
  title: string;
  /** Secondary line, e.g. "About Mochi". */
  subtitle?: string;
  /** One-line message preview. */
  preview?: string;
  receivedAt: string; // ISO
  unread: boolean;
  archived: boolean;
};

export type InboxFilterOption<T extends string> = { value: T; label: string; count?: number };
