import type { ChartConfig } from "@client/components/ui/chart";

export const seriesConfig = {
  views: { label: "Views", color: "var(--series-views)" },
  inquiries: { label: "Inquiries", color: "var(--series-inquiries)" },
} satisfies ChartConfig;

export type SeriesKey = keyof typeof seriesConfig;
