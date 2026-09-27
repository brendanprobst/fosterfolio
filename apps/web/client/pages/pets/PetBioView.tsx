"use client";

import { ShareQrDownload } from "@client/components/ShareQrDownload";
import { UserAvatar } from "@client/components/UserAvatar";
import { Markdown } from "@client/components/markdown";
import { InquiryForm } from "@client/features/inquiries";
import type { PetPublic } from "@client/features/pets";
import { humanizeToken } from "@client/lib/humanizeToken";
import { petHref } from "@client/lib/petBioPath";
import {
  fosterMeHref,
  publicHandle,
  userProfileHref,
} from "@client/lib/userProfilePath";
import Link from "next/link";
import { ReactNode, useEffect } from "react";

type PetBioViewProps = {
  pet: PetPublic;
  notice?: ReactNode;
  /** When set, the QR encodes this path instead of the pet permalink. */
  qrHref?: string;
  qrDescription?: string;
};

export function PetBioView({
  pet,
  notice,
  qrHref,
  qrDescription,
}: PetBioViewProps) {
  useEffect(() => {
    if (pet.meta?.title) {
      document.title = pet.meta.title;
      return;
    }
    document.title = "Fosterfolio";
  }, [pet.meta?.title]);

  const details = [
    pet.species,
    pet.breed,
    pet.ageValue != null ? `${pet.ageValue} ${pet.ageUnit ?? "years"}` : null,
    pet.sex,
    pet.size,
    pet.status ? humanizeToken(pet.status) : null,
    pet.subStatus ? humanizeToken(pet.subStatus) : null,
  ].filter((item): item is string => !!item);

  const ownerRef = pet.owner
    ? publicHandle(pet.owner)
    : pet.ownerId;

  return (
    <>
      {notice}
      <header className="space-y-3">
        {pet.primaryPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- static export; absolute Supabase URLs
          <img
            src={pet.primaryPhotoUrl}
            alt={pet.name}
            className="border-border aspect-[4/3] w-full rounded-lg border object-cover"
          />
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight">{pet.name}</h1>
        {details.length > 0 ? (
          <p className="text-muted-foreground text-sm capitalize">
            {details.join(" · ")}
          </p>
        ) : null}
        {pet.shelterLinkUrl ? (
          <p className="text-sm">
            Shelter:{" "}
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
      </header>

      {pet.owner ? (
        <section className="flex items-center gap-3" aria-label="Foster">
          <UserAvatar
            name={pet.owner.displayName}
            url={pet.owner.avatarUrl}
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">Fostered by</p>
            <Link
              href={userProfileHref(ownerRef)}
              className="text-primary text-sm font-medium hover:underline"
            >
              {pet.owner.displayName || "Foster profile"}
            </Link>
            <p>
              <Link
                href={fosterMeHref(ownerRef)}
                className="text-primary text-xs hover:underline"
              >
                See who they’re fostering now
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      {pet.bioMarkdown ? <Markdown>{pet.bioMarkdown}</Markdown> : null}

      {pet.importantLinks.length > 0 ? (
        <section className="space-y-2" aria-label="Links">
          <h2 className="text-lg font-medium">Links</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {pet.importantLinks.map((link) => (
              <li key={`${link.label}-${link.url}`}>
                <a
                  href={link.url}
                  className="text-primary hover:underline"
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
