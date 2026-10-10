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
import { petHref, petIdFromPetPath } from "@client/lib/petBioPath";
import { publicHandle } from "@client/lib/userProfilePath";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnalyticsView } from "./AnalyticsView";

export function PetAnalyticsPage() {
  const { loading, user } = useRequireAuth();
  const { getAccessToken } = useAuth();
  const pathname = usePathname();
  const petId = petIdFromPetPath(pathname, "analytics");
  const pet = usePet(petId);
  const [range, setRange] = useState<"7d" | "30d" | "all">("30d");
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
  const analytics = useQuery({
    queryKey: ["pet-analytics", petId, range],
    enabled: Boolean(petId && isOwner),
    queryFn: async () => fetchPetAnalytics((await getAccessToken()) ?? "", petId!, range),
  });

  if (loading || pet.isLoading || (isOwner && (analytics.isLoading || links.isLoading))) {
    return (
      <AppShell>
        <main>
          <DataPageSkeleton variant="pet" label="Loading analytics" />
        </main>
      </AppShell>
    );
  }

  if (!isOwner || !pet.data || !petId || !analytics.data) {
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
            {(["7d", "30d", "all"] as const).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={range === value ? "default" : "outline"}
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
          analytics={analytics.data}
        />
      </main>
    </AppShell>
  );
}
