"use client";

import { AppShell, PageWithSidebar } from "@client/components/layout";
import { useAuth } from "@client/auth";
import { usePet } from "@client/features/pets";
import { petHref, petIdFromPathname } from "@client/lib/petBioPath";
import { publicHandle } from "@client/lib/userProfilePath";
import { usePathname } from "next/navigation";
import { PetBioSidebar } from "./PetBioSidebar";
import { PetBioView } from "./PetBioView";

/**
 * Public pet bio. Reads the real id from the pathname (CloudFront serves the
 * static sentinel; the address bar keeps the vanity pet URL).
 */
export function PetBioPage() {
  const pathname = usePathname();
  const petId = petIdFromPathname(pathname);
  const { user } = useAuth();
  const { data: pet, isLoading, isError, error } = usePet(petId);
  const ownerRef = pet?.owner ? publicHandle(pet.owner) : pet?.ownerId ?? "";
  const isOwner = Boolean(user && pet && user.id === pet.ownerId);

  return (
    <AppShell>
      <main>
        {!petId ? (
          <p className="text-muted-foreground mx-auto max-w-5xl px-4 py-8 text-sm">
            Pet not found.
          </p>
        ) : null}
        {petId && isLoading ? (
          <p className="text-muted-foreground mx-auto max-w-5xl px-4 py-8 text-sm">
            Loading pet…
          </p>
        ) : null}
        {petId && isError ? (
          <p className="text-destructive mx-auto max-w-5xl px-4 py-8 text-sm">
            {error instanceof Error ? error.message : "Failed to load pet."}
          </p>
        ) : null}
        {pet ? (
          <PageWithSidebar
            sidebar={
              <PetBioSidebar
                petName={pet.name}
                petId={pet.id}
                petPath={petHref(ownerRef, pet.id)}
                ownerId={pet.ownerId}
                ownerRef={ownerRef}
                ownerName={pet.owner?.displayName || "Foster"}
                ownerAvatarUrl={pet.owner?.avatarUrl ?? null}
                isActivelyFostering={pet.status === "actively_fostering"}
                isOwner={isOwner}
              />
            }
          >
            <PetBioView pet={pet} />
          </PageWithSidebar>
        ) : null}
      </main>
    </AppShell>
  );
}
