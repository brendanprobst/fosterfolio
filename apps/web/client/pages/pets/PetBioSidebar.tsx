"use client";

import { ExpandableInquiryForm } from "@client/features/inquiries";
import { OwnerOnlyLabel } from "@client/components/OwnerOnlyLabel";
import { buttonVariants } from "@client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { petEditorEditHref } from "@client/lib/petEditorPath";
import { cn } from "@client/lib/utils";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { FosterStatusCard } from "./FosterStatusCard";
import { ShareLinkCard } from "./ShareLinkCard";

type PetBioSidebarProps = {
  petName: string;
  petId: string;
  petPath: string;
  ownerId: string;
  ownerRef: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  isActivelyFostering: boolean;
  isOwner: boolean;
};

export function PetBioSidebar({
  petName,
  petId,
  petPath,
  ownerId,
  ownerRef,
  ownerName,
  ownerAvatarUrl,
  isActivelyFostering,
  isOwner,
}: PetBioSidebarProps) {
  if (isOwner) {
    return (
      <>
        <Card size="sm">
          <CardHeader>
            <div className="space-y-1">
              <OwnerOnlyLabel />
              <CardTitle>Edit {petName}&apos;s bio</CardTitle>
            </div>
            <CardDescription>
              Change what visitors and adopters see on this public page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={petEditorEditHref(petId, petPath)}
              className={cn(buttonVariants({ size: "sm" }), "w-full")}
            >
              <Pencil aria-hidden />
              Edit bio
            </Link>
          </CardContent>
        </Card>
        <ShareLinkCard
          title="Share this bio"
          description={`A flyer QR stays on ${petName} — unlike a foster-me link, it will not follow the next pet.`}
          path={petPath}
          downloadName={petName}
          imageAlt={`QR code for ${petName}`}
          qrTitle={`${petName} QR`}
        />
      </>
    );
  }

  return (
    <>
      <FosterStatusCard
        petName={petName}
        ownerRef={ownerRef}
        ownerName={ownerName}
        ownerAvatarUrl={ownerAvatarUrl}
        mode="permalink"
        isCurrentFoster={isActivelyFostering}
      />
      <ExpandableInquiryForm
        targetUserId={ownerId}
        targetPetId={petId}
        heading="Contact the foster"
      />
    </>
  );
}
