"use client";

import { canonicalProfilePath } from "@client/lib/userProfilePath";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * When the API says the URL used a former handle, swap it for the current one.
 * The site is a static export (CloudFront serves one HTML for every /@handle path),
 * so this happens in the browser rather than as an HTTP 301.
 */
export function useCanonicalHandleRedirect(
  pathname: string | null | undefined,
  canonicalHandle: string | null | undefined,
): void {
  const router = useRouter();
  useEffect(() => {
    const target = canonicalProfilePath(pathname, canonicalHandle, window.location.search);
    if (target) router.replace(target);
  }, [pathname, canonicalHandle, router]);
}
