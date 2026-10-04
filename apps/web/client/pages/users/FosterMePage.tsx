"use client";

import { useAuth } from "@client/auth";
import { AppShell, DataPageSkeleton, PageWithSidebar } from "@client/components/layout";
import { useOwnerPets, usePet } from "@client/features/pets";
import { useUser } from "@client/features/users";
import { isFosterfolioSearchEnabled } from "@client/lib/fosterfolioFeatureFlags";
import { selectFosterMePet } from "@client/lib/selectFosterMePet";
import {
  fosterMeHref,
  handleFromPathname,
  publicHandle,
  userProfileHref,
} from "@client/lib/userProfilePath";
import { PetBioView } from "@client/pages/pets/PetBioView";
import { petSidebarMobileSummary } from "@client/pages/pets/PublicPetSidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { FosterMeSidebar } from "./FosterMeSidebar";

/**
 * Stable "current foster" pointer. Resolves which pet to show on every load
 * and must not redirect to a concrete pet permalink.
 */
export function FosterMePage() {
  const pathname = usePathname();
  const handle = handleFromPathname(pathname);
  const { user: viewer } = useAuth();
  const userQuery = useUser(handle);
  const petsQuery = useOwnerPets(handle);
  const user = userQuery.data;
  const selection = useMemo(
    () =>
      petsQuery.isSuccess
        ? selectFosterMePet(petsQuery.data ?? [])
        : { kind: "empty" as const },
    [petsQuery.data, petsQuery.isSuccess],
  );
  const selectedId =
    selection.kind === "empty" ? null : selection.pet.id;
  const petQuery = usePet(selectedId);

  useEffect(() => {
    if (user?.displayName) {
      document.title = `${user.displayName} · Foster me · Fosterfolio`;
      return;
    }
    document.title = "Fosterfolio";
  }, [user?.displayName]);

  const displayName = user?.displayName || "This foster";
  const pet = petQuery.data;
  const ownerRef = handle ?? (user ? publicHandle(user) : "");
  const fosterMePath = ownerRef ? fosterMeHref(ownerRef) : "";
  const isOwner = Boolean(viewer && user && viewer.id === user.id);

  const sidebar = fosterMePath ? (
    <FosterMeSidebar
      petName={pet?.name}
      petId={pet?.id}
      ownerId={user?.id ?? ""}
      ownerRef={ownerRef}
      ownerName={displayName}
      ownerAvatarUrl={user?.avatarUrl ?? pet?.owner?.avatarUrl ?? null}
      isCurrentFoster={selection.kind === "active"}
      isOwner={isOwner}
      fosterMePath={fosterMePath}
    />
  ) : null;

  return (
    <AppShell>
      <main>
        {!handle ? (
          <p className="text-muted-foreground mx-auto max-w-5xl px-4 py-8 text-sm">
            Profile not found.
          </p>
        ) : null}
        {handle && (userQuery.isLoading || petsQuery.isLoading) ? (
          <DataPageSkeleton variant="pet" label="Loading foster" />
        ) : null}
        {handle && userQuery.isError ? (
          <p className="text-destructive mx-auto max-w-5xl px-4 py-8 text-sm">
            {userQuery.error instanceof Error
              ? userQuery.error.message
              : "Failed to load profile."}
          </p>
        ) : null}
        {handle && petsQuery.isError ? (
          <p className="text-destructive mx-auto max-w-5xl px-4 py-8 text-sm">
            {petsQuery.error instanceof Error
              ? petsQuery.error.message
              : "Failed to load pets."}
          </p>
        ) : null}
        {handle && user && petsQuery.isSuccess && selection.kind === "empty" ? (
          <PageWithSidebar
            sidebar={sidebar}
            mobileSummary={petSidebarMobileSummary({
              isOwner,
              fosterName: displayName,
              variant: "foster-me",
            })}
          >
            <section className="space-y-3" aria-label="No foster listed">
              <h1 className="text-2xl font-semibold tracking-tight">
                {displayName} isn’t listed as fostering anyone right now.
              </h1>
              <p className="text-muted-foreground text-sm">
                You can still visit their profile
                {isFosterfolioSearchEnabled() ? " or browse other pets" : ""}.
              </p>
              <p className="flex flex-wrap gap-3 text-sm">
                <Link
                  href={userProfileHref(handle)}
                  className="text-primary hover:underline"
                >
                  View {displayName}’s profile
                </Link>
                {isFosterfolioSearchEnabled() ? (
                  <Link href="/search" className="text-primary hover:underline">
                    Browse other pets
                  </Link>
                ) : null}
              </p>
            </section>
          </PageWithSidebar>
        ) : null}
        {selectedId &&
        petQuery.isLoading &&
        !userQuery.isLoading &&
        !petsQuery.isLoading ? (
          <DataPageSkeleton variant="pet" label="Loading pet" />
        ) : null}
        {selectedId && petQuery.isError ? (
          <p className="text-destructive mx-auto max-w-5xl px-4 py-8 text-sm">
            {petQuery.error instanceof Error
              ? petQuery.error.message
              : "Failed to load pet."}
          </p>
        ) : null}
        {pet && (selection.kind === "active" || selection.kind === "fallback") ? (
          <PageWithSidebar
            sidebar={sidebar}
            mobileSummary={petSidebarMobileSummary({
              isOwner,
              petName: pet.name,
              fosterName: displayName,
              variant: "foster-me",
            })}
          >
            <PetBioView pet={pet} setDocumentTitle={false} />
          </PageWithSidebar>
        ) : null}
      </main>
    </AppShell>
  );
}
