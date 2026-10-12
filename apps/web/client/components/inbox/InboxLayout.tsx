"use client";

import { Button } from "@client/components/ui/button";
import { cn } from "@client/lib/utils";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

type InboxLayoutProps = {
  filters: ReactNode;
  list: ReactNode;
  detail: ReactNode;
  hasSelection: boolean;
  onBack: () => void;
  backLabel?: string;
  /** Merged onto the grid, e.g. a fixed height to embed the inbox in a page. */
  className?: string;
};

export function InboxLayout({
  filters,
  list,
  detail,
  hasSelection,
  onBack,
  backLabel = "Back to inbox",
  className,
}: InboxLayoutProps) {
  return (
    <div
      className={cn(
        "grid min-h-[60dvh] gap-0 md:grid-cols-[22rem_1fr] md:rounded-xl md:border",
        className,
      )}
    >
      <section
        aria-label="Messages"
        className={cn(
          "min-h-0 space-y-3 overflow-y-auto md:border-r md:p-3",
          hasSelection && "hidden md:block",
        )}
      >
        {filters}
        {list}
      </section>
      <section aria-label="Message" className={cn("min-h-0 overflow-y-auto md:p-6", !hasSelection && "hidden md:block")}>
        <Button type="button" variant="ghost" size="sm" className="mb-3 md:hidden" onClick={onBack}>
          <ChevronLeft aria-hidden /> {backLabel}
        </Button>
        {detail}
      </section>
    </div>
  );
}
