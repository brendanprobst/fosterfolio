"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@client/components/ui/card";
import { bucketTrend, channelDisplayName, formatConversion } from "@client/features/petInsights/present";
import type { ChannelOption, PetAnalytics, TrackedLinkItem } from "@client/features/petInsights/types";
import { cn } from "@client/lib/utils";
import Link from "next/link";
import { ChannelBarChart, TrendCharts } from "./analyticsCharts";

type AnalyticsRange = "7d" | "30d" | "all";

type AnalyticsViewProps = {
  petName: string;
  linksHref: string;
  adopted: boolean;
  links: TrackedLinkItem[];
  channels: ChannelOption[];
  analytics: PetAnalytics;
  range: AnalyticsRange;
};

const RANGE_CAPTION: Record<AnalyticsRange, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  all: "all time",
};

export function AnalyticsView({
  petName,
  linksHref,
  adopted,
  links,
  channels,
  analytics,
  range,
}: AnalyticsViewProps) {
  const nameFor = (key: string) => channelDisplayName(key, channels, links);
  const trend = bucketTrend(analytics.viewsByDay, analytics.inquiriesByDay);
  const empty = links.length === 0;
  const period = RANGE_CAPTION[range];
  const channelRows = analytics.byChannel.map((row) => ({
    key: row.channelKey,
    name: nameFor(row.channelKey),
    views: row.views,
    inquiries: row.inquiries,
  }));
  const cityMax = Math.max(1, ...analytics.byCity.map((city) => city.views));

  return (
    <div className="space-y-6">
      {adopted ? (
        <p className="bg-muted text-foreground rounded-lg px-4 py-3 text-sm font-medium" role="status">
          Final results — {petName} was adopted 🎉
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={`Views · ${period}`} value={String(analytics.funnel.views)} dot="views" />
        <Stat label={`Inquiries · ${period}`} value={String(analytics.funnel.inquiries)} dot="inquiries" />
        <Stat label={`Conversion rate · ${period}`} value={formatConversion(analytics.funnel.conversionRate)} />
      </div>

      {empty ? (
        <p className="text-muted-foreground text-sm">
          Create your first tracked link to see which channels work best.{" "}
          <Link href={linksHref} className="text-foreground underline">
            Manage links
          </Link>
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Channels</CardTitle>
            </CardHeader>
            <CardContent>
              {channelRows.length === 0 ? (
                <p className="text-muted-foreground text-sm">No channel data yet.</p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <ChannelBarChart
                    title="Views by channel"
                    series="views"
                    rows={channelRows.map((row) => ({ name: row.name, value: row.views }))}
                  />
                  <ChannelBarChart
                    title="Inquiries by channel"
                    series="inquiries"
                    rows={channelRows.map((row) => ({ name: row.name, value: row.inquiries }))}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Links</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-left">
                    <th className="py-1 font-medium">Channel</th>
                    <th className="py-1 text-right font-medium">Views</th>
                    <th className="py-1 text-right font-medium">Inquiries</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.byLink.map((row) => (
                    <tr key={row.linkId}>
                      <td className="py-1">{nameFor(row.channelKey)}</td>
                      <td className="py-1 text-right tabular-nums">{row.views}</td>
                      <td className="py-1 text-right tabular-nums">{row.inquiries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top cities</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.byCity.length === 0 ? (
                <p className="text-muted-foreground text-sm">No city data yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {analytics.byCity.map((city) => (
                    <li key={city.city} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 truncate">{city.city}</span>
                      <span className="bg-muted h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
                        <span
                          className="bg-series-views block h-1.5 rounded-full"
                          style={{ width: `${(city.views / cityMax) * 100}%` }}
                        />
                      </span>
                      <span className="text-foreground tabular-nums">{city.views}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {trend.grain === "week" ? "Views and inquiries by week" : "Views and inquiries by day"}
              </CardTitle>
              <p className="text-muted-foreground flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="bg-series-views size-2 rounded-full" />
                  Views
                </span>
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="bg-series-inquiries size-2 rounded-full" />
                  Inquiries
                </span>
              </p>
            </CardHeader>
            <CardContent>
              {trend.points.length === 0 ? (
                <p className="text-muted-foreground text-sm">No views yet.</p>
              ) : (
                <TrendCharts points={trend.points} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  dot,
}: {
  label: string;
  value: string;
  dot?: "views" | "inquiries";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          {dot ? (
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-full",
                dot === "views" ? "bg-series-views" : "bg-series-inquiries",
              )}
            />
          ) : null}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-foreground text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
