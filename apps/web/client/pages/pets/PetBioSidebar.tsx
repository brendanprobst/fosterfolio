"use client";

import { PublicPetSidebar } from "./PublicPetSidebar";

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
  capturePetEvents?: boolean;
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
  capturePetEvents = false,
}: PetBioSidebarProps) {
  return (
    <PublicPetSidebar
      isOwner={isOwner}
      capturePetEvents={capturePetEvents}
      ownerId={ownerId}
      ownerRef={ownerRef}
      ownerName={ownerName}
      ownerAvatarUrl={ownerAvatarUrl}
      petName={petName}
      petId={petId}
      isCurrentFoster={isActivelyFostering}
      fosterStatusMode="permalink"
      editReturnPath={petPath}
      editLinkLabel="Edit bio"
      share={{
        title: "Share this bio",
        description: `A flyer QR stays on ${petName} — unlike a foster-me link, it will not follow the next pet.`,
        path: petPath,
        downloadName: petName,
        imageAlt: `QR code for ${petName}`,
        qrTitle: `${petName} QR`,
      }}
    />
  );
}
