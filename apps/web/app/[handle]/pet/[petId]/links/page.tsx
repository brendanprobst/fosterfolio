import {
  HANDLE_SENTINEL_SEGMENT,
  PET_BIO_SENTINEL_ID,
} from "@client/lib/constants/petBioSentinel";
import { PetLinksPage } from "@client/pages/pets/PetLinksPage";

export function generateStaticParams() {
  return [{ handle: HANDLE_SENTINEL_SEGMENT, petId: PET_BIO_SENTINEL_ID }];
}

export default function Page() {
  return <PetLinksPage />;
}
