/**
 * Browser-visible Fosterfolio product toggles (`NEXT_PUBLIC_FOSTERFOLIO_*`).
 * Off unless the value is exactly `1`. Do not reuse `NEXT_PUBLIC_LATTICE_*`.
 */

function isFosterfolioBinaryEnv(raw: string | undefined): boolean {
  return raw?.trim() === "1";
}

/** Chronological posts at `/feed`. Default off for private beta. */
export function isFosterfolioFeedEnabled(): boolean {
  return isFosterfolioBinaryEnv(process.env.NEXT_PUBLIC_FOSTERFOLIO_FEED);
}

/** Name search at `/search`. Default off for private beta. */
export function isFosterfolioSearchEnabled(): boolean {
  return isFosterfolioBinaryEnv(process.env.NEXT_PUBLIC_FOSTERFOLIO_SEARCH);
}

/** "Continue with Google" on sign-in and sign-up. Hidden unless the value is exactly `1`. */
export function isGoogleSsoEnabled(): boolean {
  return isFosterfolioBinaryEnv(process.env.NEXT_PUBLIC_GOOGLE_SSO);
}
