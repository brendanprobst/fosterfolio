import { HANDLE_SENTINEL_SEGMENT } from "@client/lib/constants/petBioSentinel";
import { PublicProfilePage } from "@client/pages/users";

/**
 * Static-export sentinel for the vanity profile route.
 * Only this placeholder is built into the S3 bundle; CloudFront rewrites every
 * at-prefixed profile request to it while leaving the browser URL unchanged.
 */
export function generateStaticParams() {
  return [{ handle: HANDLE_SENTINEL_SEGMENT }];
}

export default function Page() {
  return <PublicProfilePage />;
}
