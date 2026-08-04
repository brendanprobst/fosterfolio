"use client";

import { Markdown } from "@client/components/markdown";
import { AppShell } from "@client/components/layout";
import { usePet } from "@client/features/pets";
import { petIdFromPathname } from "@client/lib/petBioPath";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Public pet bio shell. Reads the real id from the pathname (CloudFront serves the
 * static sentinel object; the address bar keeps `/pets/{uuid}`).
 */
export function PetBioPage() {
  const pathname = usePathname();
  const petId = petIdFromPathname(pathname);
  const { data: pet, isLoading, isError, error } = usePet(petId);

  useEffect(() => {
    if (pet?.meta?.title) {
      document.title = pet.meta.title;
      return;
    }
    document.title = "Fosterfolio";
  }, [pet?.meta?.title]);

  return (
    <AppShell>
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
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
        {pet ? (
          <>
            <header className="space-y-2">
              {pet.primaryPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- static export; absolute Supabase URLs
                <img
                  src={pet.primaryPhotoUrl}
                  alt={pet.name}
                  className="border-border aspect-[4/3] w-full rounded-lg border object-cover"
                />
              ) : null}
              <h1 className="text-3xl font-semibold tracking-tight">{pet.name}</h1>
              <p className="text-muted-foreground text-sm capitalize">
                {pet.species}
                {pet.breed ? ` · ${pet.breed}` : ""}
                {pet.status ? ` · ${pet.status.replaceAll("_", " ")}` : ""}
              </p>
            </header>
            {pet.bioMarkdown ? <Markdown>{pet.bioMarkdown}</Markdown> : null}
            {pet.updates.length > 0 ? (
              <section className="space-y-3" aria-label="Pet updates">
                <h2 className="text-lg font-medium">Updates</h2>
                <ul className="space-y-4">
                  {pet.updates.map((update) => (
                    <li key={update.id} className="border-border space-y-2 border-t pt-4">
                      {update.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={update.imageUrl}
                          alt=""
                          className="border-border max-h-64 w-full rounded-md border object-cover"
                        />
                      ) : null}
                      {update.bodyText ? (
                        <Markdown>{update.bodyText}</Markdown>
                      ) : null}
                      <p className="text-muted-foreground text-xs">
                        {new Date(update.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}
      </main>
    </AppShell>
  );
}
