"use client";

import { useAuth, useRequireAuth } from "@client/auth";
import { AppShell, DataPageSkeleton } from "@client/components/layout";
import { usePet } from "@client/features/pets";
import {
  archiveTrackedLink,
  createTrackedLink,
  fetchChannels,
  fetchPetLinks,
} from "@client/features/petInsights/petInsightsApi";
import { petHref, petIdFromPetPath } from "@client/lib/petBioPath";
import { publicHandle } from "@client/lib/userProfilePath";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { LinksManager } from "./LinksManager";

export function PetLinksPage() {
  const { loading, user } = useRequireAuth();
  const { getAccessToken } = useAuth();
  const pathname = usePathname();
  const petId = petIdFromPetPath(pathname, "links");
  const pet = usePet(petId);
  const queryClient = useQueryClient();
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

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["pet-links", petId] });
    await queryClient.invalidateQueries({ queryKey: ["me-channels"] });
  };
  const create = useMutation({
    mutationFn: async (input: { channelKey?: string; channelName?: string; label?: string | null }) =>
      createTrackedLink((await getAccessToken()) ?? "", petId!, input),
    onSuccess: () => void refresh(),
  });
  const archive = useMutation({
    mutationFn: async (input: { id: string; archived: boolean }) =>
      archiveTrackedLink((await getAccessToken()) ?? "", input.id, input.archived),
    onSuccess: () => void refresh(),
  });

  if (loading || pet.isLoading) {
    return (
      <AppShell>
        <main>
          <DataPageSkeleton variant="pet" label="Loading links" />
        </main>
      </AppShell>
    );
  }

  if (!isOwner || !pet.data || !petId) {
    return (
      <AppShell>
        <main>
          <p className="text-muted-foreground mx-auto max-w-3xl px-4 py-8 text-sm">
            These links are only available to the pet owner.
          </p>
        </main>
      </AppShell>
    );
  }

  const ownerRef = pet.data.owner ? publicHandle(pet.data.owner) : pet.data.ownerId;

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Links for {pet.data.name}</h1>
        <LinksManager
          petName={pet.data.name}
          petId={pet.data.id}
          ownerRef={ownerRef}
          links={links.data ?? []}
          channels={channels.data ?? []}
          onCreate={async (input) => {
            await create.mutateAsync(input);
          }}
          onArchive={async (link, archived) => {
            await archive.mutateAsync({ id: link.id, archived });
          }}
        />
      </main>
    </AppShell>
  );
}
