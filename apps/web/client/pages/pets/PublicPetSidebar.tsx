"use client";

import type { SidebarMobileSummary } from "@client/components/layout/PageWithSidebar";
import { ContactFosterBlock } from "@client/features/inquiries";
import { FosterStatusCard } from "./FosterStatusCard";
import { EditPetBioCard } from "./EditPetBioCard";
import { ShareLinkCard, type ShareLinkCardProps } from "./ShareLinkCard";

type PetSidebarMobileSummaryInput = {
  isOwner: boolean;
  petName?: string;
  fosterName: string;
  variant: "permalink" | "foster-me";
};

/** Short mobile launcher copy for the pet-bio and foster-me side panels. */
export function petSidebarMobileSummary({
  isOwner,
  petName,
  fosterName,
  variant,
}: PetSidebarMobileSummaryInput): SidebarMobileSummary | null {
  const foster = fosterName || "this foster";
  if (!petName) {
    if (!isOwner || variant !== "foster-me") return null;
    return {
      title: "Share your Foster Me link",
      description:
        "Copy or print a QR that always opens whoever you’re fostering now.",
    };
  }
  if (isOwner) {
    return variant === "foster-me"
      ? {
          title: `Your tools for ${petName}`,
          description:
            "Edit this pet, share the Foster Me link, and preview the inquiry visitors can send you.",
        }
      : {
          title: `Your tools for ${petName}`,
          description:
            "Edit this bio, share a link that stays on this pet, and preview the inquiry visitors can send you.",
        };
  }
  return {
    title: `Ask about ${petName}`,
    description:
      variant === "permalink"
        ? `See if ${foster} is fostering ${petName}, and send them a message.`
        : `Send ${foster} a message about adopting ${petName}.`,
  };
}

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
