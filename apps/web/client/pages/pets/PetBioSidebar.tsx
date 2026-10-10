"use client";

import { PublicPetSidebar } from "./PublicPetSidebar";
import { OwnerAnalyticsWidget } from "./OwnerAnalyticsWidget";

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
  adopted?: boolean;
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
  adopted = false,
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
      ownerPanel={
        <OwnerAnalyticsWidget
          petId={petId}
          petName={petName}
          ownerRef={ownerRef}
          adopted={adopted}
        />
      }
    />
  );
}
