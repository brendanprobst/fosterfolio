"use client";

import { OutboundLink } from "@client/components/OutboundLink";
import { PetFacts } from "@client/components/PetFacts";
import { Markdown } from "@client/components/markdown";
import type { PetPublic } from "@client/features/pets";
import { useEffect, type ReactNode } from "react";
import { PetPhotoGallery } from "./PetPhotoGallery";

type PetBioViewProps = {
  pet: PetPublic;
  /** Foster-me keeps its own document title. */
  setDocumentTitle?: boolean;
  /** Rendered after the details (guest page passes the foster card here). */
  afterDetails?: ReactNode;
};

export function PetBioView({
  pet,
  setDocumentTitle = true,
  afterDetails,
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
        <PetFacts
          pet={pet}
          part="header"
          showSpecies
          title={<h1 className="text-3xl font-semibold tracking-tight">{pet.name}</h1>}
        />
      </header>

      {pet.bioMarkdown ? <Markdown>{pet.bioMarkdown}</Markdown> : null}

      <section className="space-y-2" aria-labelledby="pet-about-heading">
        <h2 id="pet-about-heading" className="text-lg font-medium">
          About {pet.name}
        </h2>
        <PetFacts pet={pet} part="details" showSpecies />
      </section>

      {afterDetails}

      {pet.shelterLinkUrl ? (
        <p className="text-sm">
          <span className="text-muted-foreground">Shelter: </span>
          <OutboundLink href={pet.shelterLinkUrl} className="text-primary hover:underline">
            {pet.shelterLinkName || pet.shelterLinkUrl}
          </OutboundLink>
        </p>
      ) : null}

      {pet.importantLinks.length > 0 ? (
        <section className="space-y-2" aria-label="Links">
          <h2 className="text-lg font-medium">Links</h2>
          <ul className="flex flex-wrap gap-2">
            {pet.importantLinks.map((link) => (
              <li key={`${link.label}-${link.url}`}>
                <OutboundLink
                  href={link.url}
                  className="border-border hover:bg-muted/40 inline-flex rounded-full border px-3 py-1 text-sm"
                >
                  {link.label}
                </OutboundLink>
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
