"use client";

import { ShareQrDownload } from "@client/components/ShareQrDownload";
import { petHref } from "@client/lib/petBioPath";

type PetQrDownloadProps = {
  petId: string;
  petName: string;
  ownerIdOrHandle: string;
};

export function PetQrDownload({
  petId,
  petName,
  ownerIdOrHandle,
}: PetQrDownloadProps) {
  return (
    <ShareQrDownload
      href={petHref(ownerIdOrHandle, petId)}
      description="Print this on a tag or flyer. Scanning it opens this bio page."
      downloadName={petName}
      imageAlt={`QR code for ${petName}`}
    />
  );
}
