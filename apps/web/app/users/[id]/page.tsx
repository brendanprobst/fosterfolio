import { USER_PROFILE_SENTINEL_ID } from "@client/lib/constants/userProfileSentinel";
import { PublicProfilePage } from "@client/pages/users";

/**
 * Static-export sentinel for `/users/{uuid}`.
 * Only this placeholder is built into the S3 bundle; CloudFront rewrites every
 * `/users/*` request to it while leaving the browser URL unchanged.
 */
export function generateStaticParams() {
  return [{ id: USER_PROFILE_SENTINEL_ID }];
}

export default function Page() {
  return <PublicProfilePage />;
}
