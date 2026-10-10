"use client";

import { PetFacts } from "@client/components/PetFacts";
import { QrDownloadMenu } from "@client/components/qr";
import { buttonVariants } from "@client/components/ui/button";
import type { PetPublic } from "@client/features/pets";
import { absoluteUrl } from "@client/lib/absoluteUrl";
import { petEditorEditHref } from "@client/lib/petEditorPath";
import { cn } from "@client/lib/utils";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { CopyLinkButton } from "./CopyLinkButton";
import { OwnerAnalyticsWidget } from "./OwnerAnalyticsWidget";

export function OwnerPetHero({
  pet,
  ownerRef,
  petPath,
}: {
  pet: PetPublic;
  ownerRef: string;
  petPath: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PetFacts
          pet={pet}
          part="header"
          title={<h1 className="text-3xl font-semibold tracking-tight">{pet.name}</h1>}
        />
        <div className="flex flex-wrap gap-2">
          <Link href={petEditorEditHref(pet.id, petPath)} className={cn(buttonVariants())}>
            <Pencil aria-hidden /> Edit bio
          </Link>
          <CopyLinkButton path={petPath} />
          <QrDownloadMenu url={absoluteUrl(petPath)} filenameBase={pet.name} triggerLabel="QR code" />
        </div>
      </div>
      <OwnerAnalyticsWidget
        petId={pet.id}
        petName={pet.name}
        ownerRef={ownerRef}
        adopted={pet.status === "adopted"}
      />
    </div>
  );
}
