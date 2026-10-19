"use client";

import { useAuth } from "@client/auth";
import { Sparkline } from "@client/components/charts";
import { buttonVariants } from "@client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@client/components/ui/card";
import {
  channelDisplayName,
  lastNDays,
  sum,
  weekOverWeekCopy,
} from "@client/features/petInsights/present";
import { fetchChannels, fetchPetAnalytics } from "@client/features/petInsights/petInsightsApi";
import { petHref } from "@client/lib/petBioPath";
import { cn } from "@client/lib/utils";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";

type OwnerAnalyticsWidgetProps = {
  petId: string;
  petName: string;
  ownerRef: string;
  adopted: boolean;
};

export function OwnerAnalyticsWidget({
  petId,
  petName,
  ownerRef,
  adopted,
}: OwnerAnalyticsWidgetProps) {
  const { getAccessToken } = useAuth();
  const d30 = useQuery({
    queryKey: ["pet-analytics", petId, "30d"],
    staleTime: 60_000,
    queryFn: async () => fetchPetAnalytics((await getAccessToken()) ?? "", petId, "30d"),
  });
  const d7 = useQuery({
    queryKey: ["pet-analytics", petId, "7d"],
    staleTime: 60_000,
    queryFn: async () => fetchPetAnalytics((await getAccessToken()) ?? "", petId, "7d"),
  });
  const channels = useQuery({
    queryKey: ["me-channels"],
    queryFn: async () => fetchChannels((await getAccessToken()) ?? ""),
  });

  const analyticsHref = `${petHref(ownerRef, petId)}/analytics`;
  const loading = d30.isLoading || d7.isLoading;
  const views14 = lastNDays(d30.data?.viewsByDay ?? [], (point) => point.views, 14);
  const inq14 = lastNDays(d30.data?.inquiriesByDay ?? [], (point) => point.inquiries, 14);
  const views7 = views14.slice(7);
  const inq7 = inq14.slice(7);
  const top = d7.data?.byChannel[0] ?? null;
  const topShare =
    top && d7.data && d7.data.funnel.views > 0
      ? Math.round((top.views / d7.data.funnel.views) * 100)
      : null;
  const empty =
    !loading && (d30.data?.funnel.views ?? 0) === 0 && (d30.data?.funnel.inquiries ?? 0) === 0;

  return (
    <Card className="@container">
      <CardHeader>
        <CardTitle>{petName} this week</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {adopted ? (
          <p className="text-sm" role="status">
            Final results — {petName} was adopted 🎉
          </p>
        ) : null}
        {loading ? (
          <div className="grid gap-3 @lg:grid-cols-3">
            <div className="bg-muted h-32 animate-pulse rounded-xl" />
            <div className="bg-muted h-32 animate-pulse rounded-xl" />
            <div className="bg-muted h-32 animate-pulse rounded-xl" />
          </div>
        ) : empty ? (
          <p className="text-muted-foreground flex min-h-32 items-center text-sm">
            No visits yet. Share {petName}&apos;s link to start seeing views here.
          </p>
        ) : (
          <div className="grid gap-3 @lg:grid-cols-3">
            <Tile
              dot="bg-series-views"
              label="Views"
              value={sum(views7)}
              delta={adopted ? null : weekOverWeekCopy(sum(views7), sum(views14.slice(0, 7)))}
            >
              <Sparkline values={views7} series="views" label="Views per day, last 7 days" />
            </Tile>
            <Tile
              dot="bg-series-inquiries"
              label="Inquiries"
              value={sum(inq7)}
              delta={adopted ? null : weekOverWeekCopy(sum(inq7), sum(inq14.slice(0, 7)))}
            >
              <Sparkline values={inq7} series="inquiries" label="Inquiries per day, last 7 days" />
            </Tile>
            <Tile
              label="Top channel"
              value={top ? channelDisplayName(top.channelKey, channels.data ?? []) : "—"}
              delta={topShare != null ? `${topShare}% of views` : null}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href={analyticsHref} className={buttonVariants({ size: "sm" })}>
            View analytics
          </Link>
          <Link href="/profile/links" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Links &amp; analytics
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Tile({
  label,
  value,
  dot,
  delta,
  children,
}: {
  label: string;
  value: string | number;
  dot?: string;
  delta?: string | null;
  children?: ReactNode;
}) {
  return (
    // min-h matches the loading tiles (label + value + sparkline + delta) so the card doesn't grow on load.
    <div className="bg-muted/40 min-h-32 space-y-1 rounded-xl p-3">
      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        {dot ? <span aria-hidden className={cn("size-2 rounded-full", dot)} /> : null}
        {label}
      </p>
      <p className="text-foreground text-2xl font-semibold tabular-nums">{value}</p>
      {children}
      {delta ? (
        <p className={cn("text-xs", delta.startsWith("↑") ? "text-foreground" : "text-muted-foreground")}>
          {delta}
        </p>
      ) : null}
    </div>
  );
}
