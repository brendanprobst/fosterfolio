"use client";

import { ContactFosterBlock } from "@client/features/inquiries";
import { FosterStatusCard } from "./FosterStatusCard";
import { EditPetBioCard } from "./EditPetBioCard";
import { ShareLinkCard, type ShareLinkCardProps } from "./ShareLinkCard";

type PublicPetSidebarProps = {
  isOwner: boolean;
  ownerId: string;
  ownerRef: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  petName?: string;
  petId?: string;
  isCurrentFoster: boolean;
  fosterStatusMode: "permalink" | "foster-me";
  editReturnPath: string;
  editLinkLabel: string;
  share: ShareLinkCardProps;
};

export function PublicPetSidebar({
  isOwner,
  ownerId,
  ownerRef,
  ownerName,
  ownerAvatarUrl,
  petName,
  petId,
  isCurrentFoster,
  fosterStatusMode,
  editReturnPath,
  editLinkLabel,
  share,
}: PublicPetSidebarProps) {
  if (!isOwner) {
    return (
      <>
        {petName ? (
          <FosterStatusCard
            petName={petName}
            ownerRef={ownerRef}
            ownerName={ownerName}
            ownerAvatarUrl={ownerAvatarUrl}
            mode={fosterStatusMode}
            isCurrentFoster={isCurrentFoster}
          />
        ) : null}
        <ContactFosterBlock
          isOwner={false}
          targetUserId={ownerId}
          targetPetId={petId}
          petName={petName}
          fosterName={ownerName}
        />
      </>
    );
  }

  return (
    <>
      {petId && petName ? (
        <EditPetBioCard
          petName={petName}
          petId={petId}
          returnPath={editReturnPath}
          linkLabel={editLinkLabel}
        />
      ) : null}
      <ShareLinkCard {...share} />
      <ContactFosterBlock
        isOwner
        targetUserId={ownerId}
        targetPetId={petId}
        petName={petName}
      />
    </>
  );
}
