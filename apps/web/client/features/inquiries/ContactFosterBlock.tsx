"use client";

import { ExpandableInquiryForm } from "./ExpandableInquiryForm";

type ContactFosterBlockProps = {
  targetUserId: string;
  targetPetId?: string | null;
  petName?: string;
  fosterName?: string;
  capturePetEvents?: boolean;
};

/** Live inquiry for visitors. Owners do not see this form on their own pet. */
export function ContactFosterBlock({
  targetUserId,
  targetPetId,
  petName,
  fosterName,
  capturePetEvents = false,
}: ContactFosterBlockProps) {
  if (!petName) return null;
  return (
    <ExpandableInquiryForm
      targetUserId={targetUserId}
      targetPetId={targetPetId}
      heading="Contact the foster"
      fosterName={fosterName}
      petName={petName}
      capturePetEvents={capturePetEvents}
    />
  );
}
