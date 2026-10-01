"use client";

import { OwnerOnlyLabel } from "@client/components/OwnerOnlyLabel";
import { buttonVariants } from "@client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { ExpandableInquiryForm } from "@client/features/inquiries";
import { petEditorEditHref } from "@client/lib/petEditorPath";
import { cn } from "@client/lib/utils";
import { FosterStatusCard } from "@client/pages/pets/FosterStatusCard";
import { ShareLinkCard } from "@client/pages/pets/ShareLinkCard";
import { Pencil } from "lucide-react";
import Link from "next/link";

export const FOSTER_ME_QR_DESCRIPTION =
  "Print this on a tag or flyer. Scanning it always opens whoever this foster is listing now — not one specific pet.";

type FosterMeSidebarProps = {
  petName?: string;
  petId?: string;
  ownerId: string;
  ownerRef: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  isCurrentFoster: boolean;
  isOwner: boolean;
  fosterMePath: string;
};

export function FosterMeSidebar({
  petName,
  petId,
  ownerId,
  ownerRef,
  ownerName,
  ownerAvatarUrl,
  isCurrentFoster,
  isOwner,
  fosterMePath,
}: FosterMeSidebarProps) {
  return (
    <>
      {petName && !isOwner ? (
        <>
          <FosterStatusCard
            petName={petName}
            ownerRef={ownerRef}
            ownerName={ownerName}
            ownerAvatarUrl={ownerAvatarUrl}
            mode="foster-me"
            isCurrentFoster={isCurrentFoster}
          />
          <ExpandableInquiryForm
            targetUserId={ownerId}
            targetPetId={petId}
            heading="Contact the foster"
          />
        </>
      ) : null}
      {isOwner && petId && petName ? (
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
              href={petEditorEditHref(petId, fosterMePath)}
              className={cn(buttonVariants({ size: "sm" }), "w-full")}
            >
              <Pencil aria-hidden />
              Edit {petName}
            </Link>
          </CardContent>
        </Card>
      ) : null}
      {isOwner ? (
        <ShareLinkCard
          title={'"Foster Me" Link'}
          description={FOSTER_ME_QR_DESCRIPTION}
          path={fosterMePath}
          downloadName={ownerRef}
          imageAlt="QR code for the current foster page"
          qrTitle="Foster-me QR"
        />
      ) : null}
    </>
  );
}
