import {
  HANDLE_SENTINEL_SEGMENT,
  PET_BIO_SENTINEL_ID,
} from "@client/lib/constants/petBioSentinel";
import { PetBioPage } from "@client/pages/pets";

/**
 * Static-export sentinel for the vanity pet-bio route.
 * The handle segment is decorative; the page reads the real pet id from the pathname.
 */
export function generateStaticParams() {
  return [{ handle: HANDLE_SENTINEL_SEGMENT, petId: PET_BIO_SENTINEL_ID }];
}

export default function Page() {
  return <PetBioPage />;
}
