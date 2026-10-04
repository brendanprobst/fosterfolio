import {
  isFosterfolioFeedEnabled,
  isFosterfolioSearchEnabled,
  isGoogleSsoEnabled,
} from "@client/lib/fosterfolioFeatureFlags";
import { afterEach, describe, expect, it } from "vitest";

describe("fosterfolioFeatureFlags", () => {
  const feed = process.env.NEXT_PUBLIC_FOSTERFOLIO_FEED;
  const search = process.env.NEXT_PUBLIC_FOSTERFOLIO_SEARCH;
  const googleSso = process.env.NEXT_PUBLIC_GOOGLE_SSO;

  afterEach(() => {
    if (feed === undefined) delete process.env.NEXT_PUBLIC_FOSTERFOLIO_FEED;
    else process.env.NEXT_PUBLIC_FOSTERFOLIO_FEED = feed;
    if (search === undefined) delete process.env.NEXT_PUBLIC_FOSTERFOLIO_SEARCH;
    else process.env.NEXT_PUBLIC_FOSTERFOLIO_SEARCH = search;
    if (googleSso === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_SSO;
    else process.env.NEXT_PUBLIC_GOOGLE_SSO = googleSso;
  });

  it("defaults feed and search off", () => {
    delete process.env.NEXT_PUBLIC_FOSTERFOLIO_FEED;
    delete process.env.NEXT_PUBLIC_FOSTERFOLIO_SEARCH;
    expect(isFosterfolioFeedEnabled()).toBe(false);
    expect(isFosterfolioSearchEnabled()).toBe(false);
  });

  it("turns on only when the env value is 1", () => {
    process.env.NEXT_PUBLIC_FOSTERFOLIO_FEED = "1";
    process.env.NEXT_PUBLIC_FOSTERFOLIO_SEARCH = "true";
    process.env.NEXT_PUBLIC_GOOGLE_SSO = "1";
    expect(isFosterfolioFeedEnabled()).toBe(true);
    expect(isFosterfolioSearchEnabled()).toBe(false);
    expect(isGoogleSsoEnabled()).toBe(true);
  });

  it("hides Google SSO unless the env value is 1", () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_SSO;
    expect(isGoogleSsoEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_GOOGLE_SSO = "0";
    expect(isGoogleSsoEnabled()).toBe(false);
  });
});
