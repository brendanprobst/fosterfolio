"use client";

import { OwnerOnlyLabel } from "@client/components/OwnerOnlyLabel";
import { Card, CardContent, CardHeader, CardTitle } from "@client/components/ui/card";
import { useAuth } from "@client/auth";
import { channelDisplayName } from "@client/features/petInsights/present";
import {
  fetchChannels,
  fetchPetAnalyticsSummary,
} from "@client/features/petInsights/petInsightsApi";
import { petHref } from "@client/lib/petBioPath";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

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
  const summary = useQuery({
    queryKey: ["pet-analytics-summary", petId],
    queryFn: async () => fetchPetAnalyticsSummary((await getAccessToken()) ?? "", petId),
  });
  const channels = useQuery({
    queryKey: ["me-channels"],
    queryFn: async () => fetchChannels((await getAccessToken()) ?? ""),
  });
  const top = summary.data?.topChannel;
  const topName = top ? channelDisplayName(top.channelKey, channels.data ?? []) : "—";
  const analyticsHref = `${petHref(ownerRef, petId)}/analytics`;
  const linksHref = `${petHref(ownerRef, petId)}/links`;

  return (
    <Card size="sm">
      <CardHeader>
        <div className="space-y-1">
          <OwnerOnlyLabel />
          <CardTitle>Last 7 days</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {adopted ? <p>Final results — {petName} was adopted 🎉</p> : null}
        <p>{summary.data?.views ?? "—"} views</p>
        <p>{summary.data?.inquiries ?? "—"} inquiries</p>
        <p>Top channel: {topName}</p>
        <div className="flex flex-col gap-1">
          <Link href={analyticsHref} className="text-foreground underline">
            View analytics
          </Link>
          <Link href={linksHref} className="text-foreground underline">
            Manage links
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
