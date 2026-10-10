"use client";

import { cn } from "@client/lib/utils";
import { absoluteReceived, relativeReceived } from "./formatReceived";
import type { InboxEntry } from "./types";

type InboxListItemProps = {
  entry: InboxEntry;
  selected: boolean;
  onSelect: (id: string) => void;
};

export function InboxListItem({ entry, selected, onSelect }: InboxListItemProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(entry.id)}
        aria-current={selected ? "true" : undefined}
        className={cn("flex w-full gap-3 px-3 py-3 text-left", selected && "bg-muted")}
      >
        <span
          aria-hidden
          data-testid="unread-dot"
          className={cn("mt-1.5 size-2 shrink-0 rounded-full", entry.unread ? "bg-primary" : "invisible")}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={cn(entry.unread ? "font-semibold" : "text-muted-foreground font-medium")}>
              {entry.title}
            </span>
            <time
              dateTime={entry.receivedAt}
              title={absoluteReceived(entry.receivedAt)}
              className="text-muted-foreground shrink-0 text-xs tabular-nums"
            >
              {relativeReceived(entry.receivedAt)}
            </time>
          </span>
          {entry.subtitle ? <span className="text-muted-foreground block text-sm">{entry.subtitle}</span> : null}
          {entry.preview ? (
            <span className="text-muted-foreground block truncate text-sm">{entry.preview}</span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
