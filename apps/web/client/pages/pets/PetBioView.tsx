"use client";

import { ShareQrDownload } from "@client/components/ShareQrDownload";
import { Badge } from "@client/components/ui/badge";
import { Markdown } from "@client/components/markdown";
import { InquiryForm } from "@client/features/inquiries";
import type { PetPublic } from "@client/features/pets";
import { humanizeToken } from "@client/lib/humanizeToken";
import { petHref } from "@client/lib/petBioPath";
import { fosterMeHref, publicHandle } from "@client/lib/userProfilePath";
import Link from "next/link";
import { ReactNode, useEffect } from "react";
import { FosteredBy } from "./FosteredBy";

type PetBioViewProps = {
  pet: PetPublic;
  notice?: ReactNode;
  /** When set, the QR encodes this path instead of the pet permalink. */
  qrHref?: string;
  qrDescription?: string;
  /**
   * Inline QR + inquiry for pages that do not host a sidebar (foster-me).
   * Pet bio uses a sidebar and passes false.
   */
  embedActions?: boolean;
};

export function PetBioView({
  pet,
  notice,
  qrHref,
  qrDescription,
  embedActions = true,
}: PetBioViewProps) {
  useEffect(() => {
    if (pet.meta?.title) {
      document.title = pet.meta.title;
      return;
    }
    document.title = "Fosterfolio";
  }, [pet.meta?.title]);

  const facts = [
    pet.species,
    pet.breed,
    pet.ageValue != null ? `${pet.ageValue} ${pet.ageUnit ?? "years"}` : null,
    pet.sex,
    pet.size,
  ].filter((item): item is string => !!item);

  const ownerRef = pet.owner ? publicHandle(pet.owner) : pet.ownerId;

  return (
    <>
      {notice}
      <header className="space-y-4">
        {pet.primaryPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- static export; absolute Supabase URLs
          <img
            src={pet.primaryPhotoUrl}
            alt={pet.name}
            className="border-border aspect-[4/3] w-full rounded-xl border object-cover"
          />
        ) : null}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{pet.name}</h1>
            {pet.status ? (
              <Badge variant="secondary" className="capitalize">
                {humanizeToken(pet.status)}
              </Badge>
            ) : null}
            {pet.subStatus ? (
              <Badge variant="outline" className="capitalize">
                {humanizeToken(pet.subStatus)}
              </Badge>
            ) : null}
          </div>
          {facts.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {facts.map((fact) => (
                <li key={fact}>
                  <Badge variant="outline" className="capitalize">
                    {humanizeToken(fact)}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
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

      {embedActions && pet.owner ? (
        <div className="space-y-1">
          <FosteredBy
            name={pet.owner.displayName || "Foster profile"}
            avatarUrl={pet.owner.avatarUrl}
            ownerRef={ownerRef}
          />
          <p>
            <Link
              href={fosterMeHref(ownerRef)}
              className="text-primary text-xs hover:underline"
            >
              See who they’re fostering now
            </Link>
          </p>
        </div>
      ) : null}

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

      {embedActions ? (
        <>
          <ShareQrDownload
            href={qrHref ?? petHref(ownerRef, pet.id)}
            description={
              qrDescription ??
              "Print this on a tag or flyer. Scanning it opens this bio page."
            }
            downloadName={pet.name}
            imageAlt={`QR code for ${pet.name}`}
          />
          <InquiryForm targetUserId={pet.ownerId} targetPetId={pet.id} />
        </>
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
