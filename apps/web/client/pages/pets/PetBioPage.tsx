"use client";

import { AppShell } from "@client/components/layout";
import { usePet } from "@client/features/pets";
import { petIdFromPathname } from "@client/lib/petBioPath";
import { usePathname } from "next/navigation";
import { PetBioView } from "./PetBioView";

/**
 * Public pet bio. Reads the real id from the pathname (CloudFront serves the
 * static sentinel; the address bar keeps the vanity pet URL).
 */
export function PetBioPage() {
  const pathname = usePathname();
  const petId = petIdFromPathname(pathname);
  const { data: pet, isLoading, isError, error } = usePet(petId);

  return (
    <AppShell>
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
        {!petId ? (
          <p className="text-muted-foreground text-sm">Pet not found.</p>
        ) : null}
        {petId && isLoading ? (
          <p className="text-muted-foreground text-sm">Loading pet…</p>
        ) : null}
        {petId && isError ? (
          <p className="text-destructive text-sm">
            {error instanceof Error ? error.message : "Failed to load pet."}
          </p>
        ) : null}
        {pet ? <PetBioView pet={pet} /> : null}
      </main>
    </AppShell>
  );
}
