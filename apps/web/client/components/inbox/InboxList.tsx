"use client";

import type { ReactNode } from "react";
import { InboxListItem } from "./InboxListItem";
import type { InboxEntry } from "./types";

type InboxListProps = {
  entries: InboxEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  empty: ReactNode;
  loading?: boolean;
};

export function InboxList({ entries, selectedId, onSelect, empty, loading }: InboxListProps) {
  if (loading && entries.length === 0) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading messages">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="bg-muted h-16 animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) return <>{empty}</>;

  return (
    <ul className="divide-y">
      {entries.map((entry) => (
        <InboxListItem
          key={entry.id}
          entry={entry}
          selected={entry.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
