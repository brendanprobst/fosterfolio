"use client";

import { useAuth } from "@client/auth";
import { AppShell, PageWithSidebar } from "@client/components/layout";
import { useOwnerPets } from "@client/features/pets";
import { useUser } from "@client/features/users";
import { useFosterMeViewCapture } from "@client/lib/analytics/usePetViewCapture";
import { isFosterfolioSearchEnabled } from "@client/lib/fosterfolioFeatureFlags";
import { selectActiveFosters, selectFosterMePet } from "@client/lib/selectFosterMePet";
import {
  fosterMeHref,
  handleFromPathname,
  publicHandle,
  userProfileHref,
} from "@client/lib/userProfilePath";
import { petSidebarMobileSummary } from "@client/pages/pets/PublicPetSidebar";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { FosterMePreview } from "./FosterMePreview";
import { FosterMeSidebar } from "./FosterMeSidebar";

/**
 * Stable "current foster" pointer. Shows a preview of whoever this foster is
 * listing now and must not redirect to a concrete pet permalink.
 */
export function FosterMePage() {
  const pathname = usePathname();
  const handle = handleFromPathname(pathname);
  const { user: viewer, loading: authLoading } = useAuth();
  const userQuery = useUser(handle);
  const petsQuery = useOwnerPets(handle);
  const user = userQuery.data;
  const pets = petsQuery.data ?? [];
  const active = useMemo(
    () => (petsQuery.isSuccess ? selectActiveFosters(pets) : []),
    [pets, petsQuery.isSuccess],
  );
  const selection = useMemo(
    () =>
      petsQuery.isSuccess ? selectFosterMePet(pets) : { kind: "empty" as const },
    [pets, petsQuery.isSuccess],
  );
  const previewPets = active.length > 0 ? active : selection.kind === "fallback" ? [selection.pet] : [];

  useEffect(() => {
    if (user?.displayName) {
      document.title = `${user.displayName} · Foster me · Fosterfolio`;
      return;
    }
    document.title = "Fosterfolio";
  }, [user?.displayName]);

  const displayName = user?.displayName || "This foster";
  const ownerRef = handle ?? (user ? publicHandle(user) : "");
  const fosterMePath = ownerRef ? fosterMeHref(ownerRef) : "";
  const isOwner = Boolean(viewer && user && viewer.id === user.id);
  const petCount = petsQuery.data?.length ?? 0;
  // Wait for auth so the owner's own refresh isn't counted (see PetBioPage).
  useFosterMeViewCapture({
    ownerId: user?.id,
    petCount,
    capture: !authLoading && Boolean(user) && !isOwner && petCount > 0,
  });

  const sidebar = fosterMePath ? (
    <FosterMeSidebar
      ownerId={user?.id ?? ""}
      ownerRef={ownerRef}
      ownerName={displayName}
      ownerAvatarUrl={user?.avatarUrl ?? null}
      isCurrentFoster={false}
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
          <div
            className="text-muted-foreground flex min-h-[50dvh] flex-col items-center justify-center gap-3"
            role="status"
            aria-busy="true"
          >
            <Loader2 className="size-8 animate-spin" aria-hidden />
            <p className="text-sm">Loading…</p>
          </div>
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
        {user && petsQuery.isSuccess && previewPets.length > 0 ? (
          <FosterMePreview
            pets={previewPets}
            ownerRef={ownerRef}
            displayName={displayName}
            fallback={active.length === 0}
            isOwner={isOwner}
          />
        ) : null}
      </main>
    </AppShell>
  );
}
