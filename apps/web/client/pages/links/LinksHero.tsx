"use client";

import { Sparkline } from "@client/components/charts";
import { Button } from "@client/components/ui/button";
import type { OwnerLinkAnalytics } from "@client/features/petInsights/types";
import { lastNDays } from "@client/features/petInsights/present";
import { cn } from "@client/lib/utils";
import { ChevronRight, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { LINK_RANGES, RANGE_LABELS, sparklineDays, type LinkRange } from "./ownerLinks";

type LinksHeroProps = {
  analytics: OwnerLinkAnalytics | undefined;
  loading: boolean;
  range: LinkRange;
  onRangeChange: (range: LinkRange) => void;
  /** No active links yet: pulse the Create button. */
  pulse: boolean;
  onCreate: () => void;
};

export function LinksHero({ analytics, loading, range, onRangeChange, pulse, onCreate }: LinksHeroProps) {
  const days = sparklineDays(range, [
    ...(analytics?.previewViewsByDay ?? []).map((point) => point.day),
    ...(analytics?.inquiriesByDay ?? []).map((point) => point.day),
  ]);
  const views = lastNDays(analytics?.previewViewsByDay ?? [], (point) => point.previewViews, days);
  const inquiries = lastNDays(analytics?.inquiriesByDay ?? [], (point) => point.inquiries, days);
  const funnel = analytics?.funnel;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Links &amp; QR codes</h1>
          <p className="text-muted-foreground max-w-prose text-sm">
            Every link opens your foster-me page, so it never goes stale when your foster changes.
          </p>
        </div>
        <span className="relative inline-flex">
          {pulse ? (
            <span
              aria-hidden
              data-testid="create-link-pulse"
              className="bg-primary/40 absolute inset-0 rounded-lg motion-safe:animate-ping"
            />
          ) : null}
          <Button type="button" size="lg" className="relative" onClick={onCreate}>
            <Plus aria-hidden />
            Create link
          </Button>
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
          {LINK_RANGES.map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={range === value ? "default" : "outline"}
              aria-pressed={range === value}
              onClick={() => onRangeChange(value)}
            >
              {RANGE_LABELS[value]}
            </Button>
          ))}
        </div>
        {loading ? (
          <div className="grid gap-3 md:grid-cols-3" aria-hidden>
            <div className="bg-muted h-28 animate-pulse rounded-xl" />
            <div className="bg-muted h-28 animate-pulse rounded-xl" />
            <div className="bg-muted h-28 animate-pulse rounded-xl" />
          </div>
        ) : (
          <ol className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center" aria-label="Foster-me funnel">
            <Tile dot="bg-series-views" label="Preview views" value={funnel?.previewViews ?? 0}>
              <Sparkline values={views} series="views" label={`Preview views per day, ${RANGE_LABELS[range].toLowerCase()}`} />
            </Tile>
            <Step />
            <Tile label="Pet taps" value={funnel?.petTaps ?? 0}>
              <p className="text-muted-foreground text-xs">Visitors who opened a pet from your page</p>
            </Tile>
            <Step />
            <Tile dot="bg-series-inquiries" label="Inquiries" value={funnel?.inquiries ?? 0}>
              <Sparkline values={inquiries} series="inquiries" label={`Inquiries per day, ${RANGE_LABELS[range].toLowerCase()}`} />
            </Tile>
          </ol>
        )}
      </div>
    </div>
  );
}

function Step() {
  return (
    <li aria-hidden className="text-muted-foreground hidden justify-center md:flex">
      <ChevronRight className="size-5" />
    </li>
  );
}

function Tile({
  label,
  value,
  dot,
  children,
}: {
  label: string;
  value: number;
  dot?: string;
  children?: ReactNode;
}) {
  return (
    <li className="bg-background/70 h-full space-y-1 rounded-xl p-4">
      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        {dot ? <span aria-hidden className={cn("size-2 rounded-full", dot)} /> : null}
        {label}
      </p>
      <p className="text-foreground text-3xl font-semibold tabular-nums">{value}</p>
      {children}
    </li>
  );
}
