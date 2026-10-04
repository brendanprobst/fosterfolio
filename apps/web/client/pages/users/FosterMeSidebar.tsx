"use client";

import { PublicPetSidebar } from "@client/pages/pets/PublicPetSidebar";

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
    <PublicPetSidebar
      isOwner={isOwner}
      ownerId={ownerId}
      ownerRef={ownerRef}
      ownerName={ownerName}
      ownerAvatarUrl={ownerAvatarUrl}
      petName={petName}
      petId={petId}
      isCurrentFoster={isCurrentFoster}
      fosterStatusMode="foster-me"
      editReturnPath={fosterMePath}
      editLinkLabel={petName ? `Edit ${petName}` : "Edit bio"}
      share={{
        title: '"Foster Me" Link',
        description: FOSTER_ME_QR_DESCRIPTION,
        path: fosterMePath,
        downloadName: ownerRef,
        imageAlt: "QR code for the current foster page",
        qrTitle: "Foster-me QR",
      }}
    />
  );
}
