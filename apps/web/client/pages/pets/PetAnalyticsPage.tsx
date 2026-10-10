"use client";

import { useAuth, useRequireAuth } from "@client/auth";
import { AppShell, DataPageSkeleton } from "@client/components/layout";
import { Button } from "@client/components/ui/button";
import { usePet } from "@client/features/pets";
import {
  fetchChannels,
  fetchPetAnalytics,
  fetchPetLinks,
} from "@client/features/petInsights/petInsightsApi";
import type { PetAnalytics } from "@client/features/petInsights/types";
import { petHref, petIdFromPetPath } from "@client/lib/petBioPath";
import { publicHandle } from "@client/lib/userProfilePath";
import { useQuery, useQueries } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnalyticsView } from "./AnalyticsView";

export function PetAnalyticsPage() {
  const { loading, user } = useRequireAuth();
  const { getAccessToken } = useAuth();
  const pathname = usePathname();
  const petId = petIdFromPetPath(pathname, "analytics");
  const pet = usePet(petId);
  const [range, setRange] = useState<Range>("30d");
  const isOwner = Boolean(user && pet.data && user.id === pet.data.ownerId);

  const links = useQuery({
    queryKey: ["pet-links", petId],
    enabled: Boolean(petId && isOwner),
    queryFn: async () => fetchPetLinks((await getAccessToken()) ?? "", petId!),
  });
  const channels = useQuery({
    queryKey: ["me-channels"],
    enabled: Boolean(isOwner),
    queryFn: async () => fetchChannels((await getAccessToken()) ?? ""),
  });
  const analytics = useQueries({
    queries: RANGES.map((value) => ({
      queryKey: ["pet-analytics", petId, value] as const,
      enabled: Boolean(petId && isOwner),
      staleTime: 60_000,
      queryFn: async () => fetchPetAnalytics((await getAccessToken()) ?? "", petId!, value),
    })),
    combine: (results) => ({
      byRange: Object.fromEntries(RANGES.map((value, index) => [value, results[index]?.data])) as Record<
        Range,
        PetAnalytics | undefined
      >,
      isLoading: results.some((query) => query.isLoading),
      isError: results.some((query) => query.isError),
    }),
  });
  const current = analytics.byRange[range];

  if (loading || pet.isLoading || (isOwner && (analytics.isLoading || links.isLoading))) {
    return (
      <AppShell>
        <main>
          <DataPageSkeleton variant="analytics" label="Loading analytics" />
        </main>
      </AppShell>
    );
  }

  if (isOwner && analytics.isError) {
    return (
      <AppShell>
        <main>
          <p className="text-muted-foreground mx-auto max-w-3xl px-4 py-8 text-sm">
            Couldn&apos;t load analytics. Try again in a moment.
          </p>
        </main>
      </AppShell>
    );
  }

  if (!isOwner || !pet.data || !petId || !current) {
    return (
      <AppShell>
        <main>
          <p className="text-muted-foreground mx-auto max-w-3xl px-4 py-8 text-sm">
            Analytics are only available to the pet owner.
          </p>
        </main>
      </AppShell>
    );
  }

  const ownerRef = pet.data.owner ? publicHandle(pet.data.owner) : pet.data.ownerId;

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Analytics for {pet.data.name}</h1>
          <div className="flex gap-2" role="group" aria-label="Range">
            {RANGES.map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={range === value ? "default" : "outline"}
                aria-pressed={range === value}
                onClick={() => setRange(value)}
              >
                {value === "all" ? "All" : value}
              </Button>
            ))}
          </div>
        </div>
        <AnalyticsView
          petName={pet.data.name}
          linksHref={`${petHref(ownerRef, pet.data.id)}/links`}
          adopted={pet.data.status === "adopted"}
          links={links.data ?? []}
          channels={channels.data ?? []}
          analytics={current}
          range={range}
        />
      </main>
    </AppShell>
  );
}

const RANGES = ["7d", "30d", "all"] as const;
type Range = (typeof RANGES)[number];

