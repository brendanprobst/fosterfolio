"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@client/components/ui/card";
import {
  bucketViewsByDay,
  channelDisplayName,
  formatConversion,
} from "@client/features/petInsights/present";
import type { ChannelOption, PetAnalytics, TrackedLinkItem } from "@client/features/petInsights/types";
import Link from "next/link";

type AnalyticsViewProps = {
  petName: string;
  linksHref: string;
  adopted: boolean;
  links: TrackedLinkItem[];
  channels: ChannelOption[];
  analytics: PetAnalytics;
};

export function AnalyticsView({
  petName,
  linksHref,
  adopted,
  links,
  channels,
  analytics,
}: AnalyticsViewProps) {
  const nameFor = (key: string) => channelDisplayName(key, channels, links);
  const series = bucketViewsByDay(analytics.viewsByDay);
  const empty = links.length === 0;

  return (
    <div className="space-y-6">
      {adopted ? (
        <p className="bg-muted text-foreground rounded-lg px-4 py-3 text-sm font-medium" role="status">
          Final results — {petName} was adopted 🎉
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Views" value={String(analytics.funnel.views)} />
        <Stat label="Inquiries" value={String(analytics.funnel.inquiries)} />
        <Stat label="Conversion rate" value={formatConversion(analytics.funnel.conversionRate)} />
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
              <ChannelBars rows={analytics.byChannel} nameFor={nameFor} />
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
                    <th className="py-1 font-medium">Views</th>
                    <th className="py-1 font-medium">Inquiries</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.byLink.map((row) => (
                    <tr key={row.linkId}>
                      <td className="py-1">{nameFor(row.channelKey)}</td>
                      <td className="py-1">{row.views}</td>
                      <td className="py-1">{row.inquiries}</td>
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
                <ul className="space-y-1 text-sm">
                  {analytics.byCity.map((city) => (
                    <li key={city.city}>
                      {city.city} · {city.views} views
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="opacity-80">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-base">
                {series.grain === "week" ? "Views by week" : "Views by day"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ViewsLine points={series.points} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ChannelBars({
  rows,
  nameFor,
}: {
  rows: PetAnalytics["byChannel"];
  nameFor: (key: string) => string;
}) {
  const max = Math.max(1, ...rows.flatMap((row) => [row.views, row.inquiries]));
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">No channel data yet.</p>;
  }
  const width = 320;
  const rowHeight = 36;
  const height = rows.length * rowHeight;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Views and inquiries by channel" className="w-full">
      {rows.map((row, index) => {
        const y = index * rowHeight;
        return (
          <g key={row.channelKey}>
            <text x="0" y={y + 12} className="fill-foreground" fontSize="11">
              {nameFor(row.channelKey)}
            </text>
            <rect x="110" y={y + 4} height="8" width={(row.views / max) * 200} className="fill-primary" />
            <rect x="110" y={y + 16} height="8" width={(row.inquiries / max) * 200} className="fill-muted-foreground" />
          </g>
        );
      })}
    </svg>
  );
}

function ViewsLine({ points }: { points: Array<{ label: string; views: number }> }) {
  if (points.length === 0) {
    return <p className="text-muted-foreground text-sm">No views yet.</p>;
  }
  const width = 320;
  const height = 80;
  const max = Math.max(1, ...points.map((point) => point.views));
  const step = points.length === 1 ? 0 : width / (points.length - 1);
  const d = points
    .map((point, index) => {
      const x = index * step;
      const y = height - (point.views / max) * (height - 8) - 4;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Views over time" className="text-muted-foreground w-full">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
