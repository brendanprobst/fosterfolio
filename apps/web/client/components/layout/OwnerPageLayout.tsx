"use client";

import { cn } from "@client/lib/utils";
import { ArrowDown, Eye } from "lucide-react";
import type { ReactNode } from "react";

type OwnerPageLayoutProps = {
  /** Owner-only tools. Rendered in a tinted band. */
  hero: ReactNode;
  /** What visitors see. Omit for owner-only pages (e.g. /profile). */
  preview?: ReactNode;
  previewLabel?: string;
  /** Pet bio wants the preview below the fold; /profile does not. */
  fillFold?: boolean;
};

export function OwnerPageLayout({
  hero,
  preview,
  previewLabel = "Public preview — this is what visitors see",
  fillFold = false,
}: OwnerPageLayoutProps) {
  return (
    <div className="space-y-10 pb-16">
      <section
        aria-label="Your tools"
        className={cn(
          "bg-muted/60 border-b",
          // AppHeader is h-16 (4rem).
          fillFold && "flex min-h-[calc(100dvh-4rem)] flex-col",
        )}
      >
        <div
          className={cn(
            "mx-auto w-full max-w-5xl px-4 py-6 md:py-10",
            fillFold && "flex flex-1 flex-col",
          )}
        >
          <div className={cn(fillFold && "flex-1")}>{hero}</div>
          {preview && fillFold ? (
            <a
              href="#public-preview"
              className="text-muted-foreground hover:text-foreground mt-6 inline-flex items-center gap-1 self-center text-sm"
            >
              See your public page <ArrowDown aria-hidden className="size-4" />
            </a>
          ) : null}
        </div>
      </section>
      {preview ? (
        <section
          id="public-preview"
          aria-label="Public preview"
          className="mx-auto w-full max-w-5xl px-4"
        >
          <div className="text-muted-foreground mb-6 flex items-center gap-3 text-xs font-medium tracking-wide uppercase">
            <span aria-hidden className="bg-border h-px flex-1" />
            <Eye aria-hidden className="size-3.5" />
            {previewLabel}
            <span aria-hidden className="bg-border h-px flex-1" />
          </div>
          {preview}
        </section>
      ) : null}
    </div>
  );
}
