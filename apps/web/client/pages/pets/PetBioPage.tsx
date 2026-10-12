"use client";

import { AppShell, DataPageSkeleton, OwnerPageLayout } from "@client/components/layout";
import { useAuth } from "@client/auth";
import { InquiryCta } from "@client/features/inquiries";
import { usePet } from "@client/features/pets";
import { useOwnUser } from "@client/features/users";
import { syncPetCaptureSuppression } from "@client/lib/analytics/initFosterfolioAnalytics";
import { usePetViewCapture } from "@client/lib/analytics/usePetViewCapture";
import { petHref, petIdFromPathname } from "@client/lib/petBioPath";
import {
  handleFromPathname,
  normalizeHandleInput,
  publicHandle,
} from "@client/lib/userProfilePath";
import { readViewerHint, viewerMatchesOwnerSegment, type ViewerHint } from "@client/lib/viewerHint";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FosterStatusCard } from "./FosterStatusCard";
import { OwnerPetHero } from "./OwnerPetHero";
import { PetBioView } from "./PetBioView";

/**
 * Public pet bio. Reads the real id from the pathname (CloudFront serves the
 * static sentinel; the address bar keeps the vanity pet URL).
 */
export function PetBioPage() {
  const pathname = usePathname();
  const petId = petIdFromPathname(pathname);
  const { user, loading: authLoading } = useAuth();
  const { data: pet, isLoading, isError, error } = usePet(petId);
  const own = useOwnUser(user?.id ?? null);
  const ownerRef = pet?.owner ? publicHandle(pet.owner) : pet?.ownerId ?? "";
  const isOwner = Boolean(user && pet && user.id === pet.ownerId);
  const capturePetEvents = Boolean(pet) && !isOwner && pet?.status !== "adopted";
  if (pet) {
    syncPetCaptureSuppression({ isOwner, status: pet.status });
  }
  usePetViewCapture(pet, capturePetEvents);
  // Before the pet loads, guess ownership from the URL's owner segment so the skeleton
  // matches the owner tools. On refresh the session restores after this page starts
  // loading, so the stored viewer hint stands in until auth resolves. `undefined` = not read
  // yet (static HTML / first paint): show no skeleton rather than flash the public shape.
  const [hint, setHint] = useState<ViewerHint | null | undefined>(undefined);
  useEffect(() => setHint(readViewerHint()), []);
  const hintPending = authLoading && hint === undefined;
  const viewer = authLoading
    ? hint ?? null
    : user
      ? { id: user.id, handle: own.data?.handle ?? (hint?.id === user.id ? hint.handle : null) }
      : null;
  const likelyOwner = viewerMatchesOwnerSegment(
    viewer,
    normalizeHandleInput(handleFromPathname(pathname) ?? ""),
  );

  return (
    <AppShell>
      <main>
        {!petId ? (
          <p className="text-muted-foreground mx-auto max-w-5xl px-4 py-8 text-sm">
            Pet not found.
          </p>
        ) : null}
        {petId && isLoading && !hintPending ? (
          likelyOwner ? (
            <OwnerPageLayout
              fillFold
              hero={<DataPageSkeleton variant="owner-pet" label="Loading pet" embedded />}
            />
          ) : (
            <DataPageSkeleton variant="pet" label="Loading pet" />
          )
        ) : null}
        {petId && isError ? (
          <p className="text-destructive mx-auto max-w-5xl px-4 py-8 text-sm">
            {error instanceof Error ? error.message : "Failed to load pet."}
          </p>
        ) : null}
        {pet && !isOwner ? (
          <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 pb-28">
            <PetBioView
              pet={pet}
              afterDetails={
                <FosterStatusCard
                  petName={pet.name}
                  ownerRef={ownerRef}
                  ownerName={pet.owner?.displayName || "Foster"}
                  ownerAvatarUrl={pet.owner?.avatarUrl ?? null}
                  mode="permalink"
                  isCurrentFoster={pet.status === "actively_fostering"}
                />
              }
            />
            {pet.status !== "adopted" ? (
              <InquiryCta
                targetUserId={pet.ownerId}
                targetPetId={pet.id}
                petName={pet.name}
                fosterName={pet.owner?.displayName || "Foster"}
                capturePetEvents={capturePetEvents}
              />
            ) : null}
          </div>
        ) : null}
        {pet && isOwner ? (
          <OwnerPageLayout
            fillFold
            hero={<OwnerPetHero pet={pet} ownerRef={ownerRef} petPath={petHref(ownerRef, pet.id)} />}
            preview={
              <div className="mx-auto max-w-3xl space-y-8">
                <PetBioView
                  pet={pet}
                  afterDetails={
                    <FosterStatusCard
                      petName={pet.name}
                      ownerRef={ownerRef}
                      ownerName={pet.owner?.displayName || "Foster"}
                      ownerAvatarUrl={pet.owner?.avatarUrl ?? null}
                      mode="permalink"
                      isCurrentFoster={pet.status === "actively_fostering"}
                    />
                  }
                />
                {pet.status !== "adopted" ? (
                  <InquiryCta
                    preview
                    targetUserId={pet.ownerId}
                    targetPetId={pet.id}
                    petName={pet.name}
                  />
                ) : null}
              </div>
            }
          />
        ) : null}
      </main>
    </AppShell>
  );
}
