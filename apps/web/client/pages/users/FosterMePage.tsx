"use client";

import { ShareQrDownload } from "@client/components/ShareQrDownload";
import { AppShell } from "@client/components/layout";
import { useOwnerPets, usePet } from "@client/features/pets";
import { useUser } from "@client/features/users";
import { selectFosterMePet } from "@client/lib/selectFosterMePet";
import {
  fosterMeHref,
  handleFromPathname,
  userProfileHref,
} from "@client/lib/userProfilePath";
import { PetBioView } from "@client/pages/pets/PetBioView";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

const FOSTER_ME_QR_DESCRIPTION =
  "Print this on a tag or flyer. Scanning it always opens whoever this foster is listing now — not one specific pet.";

/**
 * Stable "current foster" pointer. Resolves which pet to show on every load
 * and must not redirect to a concrete pet permalink.
 */
export function FosterMePage() {
  const pathname = usePathname();
  const handle = handleFromPathname(pathname);
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
  const fosterMePath = handle ? fosterMeHref(handle) : null;
  const fosterMeQr = fosterMePath ? (
    <ShareQrDownload
      href={fosterMePath}
      description={FOSTER_ME_QR_DESCRIPTION}
      downloadName={handle ?? "foster-me"}
      imageAlt="QR code for the current foster page"
    />
  ) : null;

  return (
    <AppShell>
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
        {!handle ? (
          <p className="text-muted-foreground text-sm">Profile not found.</p>
        ) : null}
        {handle && (userQuery.isLoading || petsQuery.isLoading) ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : null}
        {handle && userQuery.isError ? (
          <p className="text-destructive text-sm">
            {userQuery.error instanceof Error
              ? userQuery.error.message
              : "Failed to load profile."}
          </p>
        ) : null}
        {handle && petsQuery.isError ? (
          <p className="text-destructive text-sm">
            {petsQuery.error instanceof Error
              ? petsQuery.error.message
              : "Failed to load pets."}
          </p>
        ) : null}
        {handle && user && petsQuery.isSuccess && selection.kind === "empty" ? (
          <section className="space-y-3" aria-label="No foster listed">
            <h1 className="text-2xl font-semibold tracking-tight">
              {displayName} isn’t listed as fostering anyone right now.
            </h1>
            <p className="text-muted-foreground text-sm">
              You can still visit their profile or browse other pets.
            </p>
            <p className="flex flex-wrap gap-3 text-sm">
              <Link
                href={userProfileHref(handle)}
                className="text-primary hover:underline"
              >
                View {displayName}’s profile
              </Link>
              <Link href="/search" className="text-primary hover:underline">
                Browse other pets
              </Link>
            </p>
            {fosterMeQr}
          </section>
        ) : null}
        {selectedId && petQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading pet…</p>
        ) : null}
        {selectedId && petQuery.isError ? (
          <p className="text-destructive text-sm">
            {petQuery.error instanceof Error
              ? petQuery.error.message
              : "Failed to load pet."}
          </p>
        ) : null}
        {pet && selection.kind === "fallback" ? (
          <PetBioView
            pet={pet}
            qrHref={fosterMePath ?? undefined}
            qrDescription={FOSTER_ME_QR_DESCRIPTION}
            notice={
              <p
                className="border-border bg-muted/40 rounded-lg border px-3 py-2 text-sm"
                role="status"
              >
                This may not be who {displayName} is fostering right now — ask
                below if {pet.name} is still looking for a home.
              </p>
            }
          />
        ) : null}
        {pet && selection.kind === "active" ? (
          <PetBioView
            pet={pet}
            qrHref={fosterMePath ?? undefined}
            qrDescription={FOSTER_ME_QR_DESCRIPTION}
          />
        ) : null}
      </main>
    </AppShell>
  );
}
