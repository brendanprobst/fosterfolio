"use client";

import { ChartContainer } from "@client/components/ui/chart";
import { Line, LineChart } from "recharts";
import { seriesConfig, type SeriesKey } from "./chartConfig";

type SparklineProps = {
  /** Oldest → newest. */
  values: number[];
  series: SeriesKey;
  label: string;
};

export function Sparkline({ values, series, label }: SparklineProps) {
  if (values.length < 2) return null;
  const data = values.map((y, x) => ({ x, y }));
  return (
    <ChartContainer config={seriesConfig} className="aspect-auto h-10 w-full" role="img" aria-label={label}>
      <LineChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
        <Line dataKey="y" type="monotone" stroke={`var(--color-${series})`} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ChartContainer>
  );
}
