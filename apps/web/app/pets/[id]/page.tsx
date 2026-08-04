import { PET_BIO_SENTINEL_ID } from "@client/lib/constants/petBioSentinel";
import { PetBioPage } from "@client/pages/pets";

/**
 * Static-export sentinel for `/pets/{uuid}`.
 * Only this placeholder is built into the S3 bundle; CloudFront rewrites every
 * `/pets/*` request to it while leaving the browser URL unchanged.
 */
export function generateStaticParams() {
  return [{ id: PET_BIO_SENTINEL_ID }];
}

export default function Page() {
  return <PetBioPage />;
}
