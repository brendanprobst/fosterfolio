"use client";

import { ExpandableInquiryForm } from "@client/features/inquiries";
import { FosterStatusCard } from "@client/pages/pets/FosterStatusCard";
import { ShareLinkCard } from "@client/pages/pets/ShareLinkCard";

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
