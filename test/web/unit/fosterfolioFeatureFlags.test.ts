import {
  isFosterfolioFeedEnabled,
  isFosterfolioSearchEnabled,
  isFosterfolioSsoHidden,
} from "@client/lib/fosterfolioFeatureFlags";
import { afterEach, describe, expect, it } from "vitest";

describe("fosterfolioFeatureFlags", () => {
  const feed = process.env.NEXT_PUBLIC_FOSTERFOLIO_FEED;
  const search = process.env.NEXT_PUBLIC_FOSTERFOLIO_SEARCH;
  const hideSso = process.env.NEXT_PUBLIC_FOSTERFOLIO_HIDE_SSO;

  afterEach(() => {
    if (feed === undefined) delete process.env.NEXT_PUBLIC_FOSTERFOLIO_FEED;
    else process.env.NEXT_PUBLIC_FOSTERFOLIO_FEED = feed;
    if (search === undefined) delete process.env.NEXT_PUBLIC_FOSTERFOLIO_SEARCH;
    else process.env.NEXT_PUBLIC_FOSTERFOLIO_SEARCH = search;
    if (hideSso === undefined) delete process.env.NEXT_PUBLIC_FOSTERFOLIO_HIDE_SSO;
    else process.env.NEXT_PUBLIC_FOSTERFOLIO_HIDE_SSO = hideSso;
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
    process.env.NEXT_PUBLIC_FOSTERFOLIO_HIDE_SSO = "1";
    expect(isFosterfolioFeedEnabled()).toBe(true);
    expect(isFosterfolioSearchEnabled()).toBe(false);
    expect(isFosterfolioSsoHidden()).toBe(true);
  });

  it("leaves SSO buttons visible unless HIDE_SSO is 1", () => {
    delete process.env.NEXT_PUBLIC_FOSTERFOLIO_HIDE_SSO;
    expect(isFosterfolioSsoHidden()).toBe(false);
    process.env.NEXT_PUBLIC_FOSTERFOLIO_HIDE_SSO = "true";
    expect(isFosterfolioSsoHidden()).toBe(false);
  });
});
