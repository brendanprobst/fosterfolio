"use client";

import { PetFacts } from "@client/components/PetFacts";
import { Markdown } from "@client/components/markdown";
import type { PetPublic } from "@client/features/pets";
import { useEffect } from "react";
import { PetPhotoGallery } from "./PetPhotoGallery";

type PetBioViewProps = {
  pet: PetPublic;
  /** Foster-me keeps its own document title. */
  setDocumentTitle?: boolean;
};

export function PetBioView({
  pet,
  setDocumentTitle = true,
}: PetBioViewProps) {
  useEffect(() => {
    if (!setDocumentTitle) return;
    if (pet.meta?.title) {
      document.title = pet.meta.title;
      return;
    }
    document.title = "Fosterfolio";
  }, [pet.meta?.title, setDocumentTitle]);

  return (
    <>
      <header className="space-y-4">
        <PetPhotoGallery
          key={pet.id}
          name={pet.name}
          photos={pet.photos}
          primaryPhotoUrl={pet.primaryPhotoUrl}
        />
        <div className="space-y-3">
          <PetFacts
            pet={pet}
            showSpecies
            title={
              <h1 className="text-3xl font-semibold tracking-tight">{pet.name}</h1>
            }
          />
          {pet.shelterLinkUrl ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Shelter: </span>
              <a
                href={pet.shelterLinkUrl}
                className="text-primary hover:underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                {pet.shelterLinkName || pet.shelterLinkUrl}
              </a>
            </p>
          ) : null}
        </div>
      </header>

      {pet.bioMarkdown ? <Markdown>{pet.bioMarkdown}</Markdown> : null}

      {pet.importantLinks.length > 0 ? (
        <section className="space-y-2" aria-label="Links">
          <h2 className="text-lg font-medium">Links</h2>
          <ul className="flex flex-wrap gap-2">
            {pet.importantLinks.map((link) => (
              <li key={`${link.label}-${link.url}`}>
                <a
                  href={link.url}
                  className="border-border hover:bg-muted/40 inline-flex rounded-full border px-3 py-1 text-sm"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
                {update.bodyText ? <Markdown>{update.bodyText}</Markdown> : null}
                <p className="text-muted-foreground text-xs">
                  {new Date(update.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
