"use client";

import { cn } from "@client/lib/utils";
import type { InboxFilterOption } from "./types";

type InboxFiltersProps<T extends string> = {
  value: T;
  options: InboxFilterOption<T>[];
  onChange: (value: T) => void;
};

export function InboxFilters<T extends string>({ value, options, onChange }: InboxFiltersProps<T>) {
  return (
    <div role="group" aria-label="Inbox filters" className="bg-muted flex rounded-lg p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm",
              active ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            {option.count != null ? (
              <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs tabular-nums">
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
