"use client";

import { seriesConfig, type SeriesKey } from "@client/components/charts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@client/components/ui/chart";
import type { TrendBucket } from "@client/features/petInsights/present";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

/** One measure per chart; render two side by side for views + inquiries. */
export function ChannelBarChart({
  rows,
  series,
  title,
}: {
  rows: Array<{ name: string; value: number }>;
  series: SeriesKey;
  title: string;
}) {
  return (
    <figure className="space-y-2">
      <figcaption className="text-muted-foreground flex items-center gap-2 text-sm">
        <span
          aria-hidden
          className={
            series === "views" ? "bg-series-views size-2 rounded-full" : "bg-series-inquiries size-2 rounded-full"
          }
        />
        {title}
      </figcaption>
      <ChartContainer
        config={seriesConfig}
        className="aspect-auto w-full"
        style={{ height: Math.max(96, rows.length * 36) }}
      >
        <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 16 }} barCategoryGap="30%">
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={112} tickLine={false} axisLine={false} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar dataKey="value" name={seriesConfig[series].label} fill={`var(--color-${series})`} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <th scope="row">{row.name}</th>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Views area on top, inquiries bars underneath, sharing one x-axis via syncId. */
export function TrendCharts({ points }: { points: TrendBucket[] }) {
  return (
    <div className="space-y-1">
      <ChartContainer config={seriesConfig} className="aspect-auto h-44 w-full">
        <AreaChart data={points} syncId="pet-trend" margin={{ left: 0, right: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" hide />
          <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
          <Area
            dataKey="views"
            type="monotone"
            stroke="var(--color-views)"
            strokeWidth={2}
            fill="var(--color-views)"
            fillOpacity={0.12}
          />
        </AreaChart>
      </ChartContainer>
      <ChartContainer config={seriesConfig} className="aspect-auto h-20 w-full">
        <BarChart data={points} syncId="pet-trend" margin={{ left: 0, right: 8 }}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tickFormatter={shortDate} />
          <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="inquiries" fill="var(--color-inquiries)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function shortDate(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  return Number.isNaN(date.getTime())
    ? day
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}
