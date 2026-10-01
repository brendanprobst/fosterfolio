"use client";

import { ExpandableInquiryForm } from "./ExpandableInquiryForm";
import { LockedInquiryPreview } from "./LockedInquiryPreview";

type ContactFosterBlockProps = {
  isOwner: boolean;
  targetUserId: string;
  targetPetId?: string | null;
  petName?: string;
};

/** Live inquiry for visitors; locked preview when the foster is looking at their own page. */
export function ContactFosterBlock({
  isOwner,
  targetUserId,
  targetPetId,
  petName,
}: ContactFosterBlockProps) {
  if (!petName) return null;
  if (isOwner) {
    return <LockedInquiryPreview petName={petName} />;
  }
  return (
    <ExpandableInquiryForm
      targetUserId={targetUserId}
      targetPetId={targetPetId}
      heading="Contact the foster"
    />
  );
}
