import { HANDLE_SENTINEL_SEGMENT } from "@client/lib/constants/petBioSentinel";
import { FosterMePage } from "@client/pages/users";

/**
 * Static-export sentinel for the vanity foster-me route.
 * CloudFront rewrites at-prefixed foster-me requests here; the page resolves
 * the current foster from the live API and must not redirect to a pet permalink.
 */
export function generateStaticParams() {
  return [{ handle: HANDLE_SENTINEL_SEGMENT }];
}

export default function Page() {
  return <FosterMePage />;
}
