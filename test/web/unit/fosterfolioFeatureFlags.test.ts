import {
  isFosterfolioFeedEnabled,
  isFosterfolioSearchEnabled,
} from "@client/lib/fosterfolioFeatureFlags";
import { afterEach, describe, expect, it } from "vitest";

describe("fosterfolioFeatureFlags", () => {
  const feed = process.env.NEXT_PUBLIC_FOSTERFOLIO_FEED;
  const search = process.env.NEXT_PUBLIC_FOSTERFOLIO_SEARCH;

  afterEach(() => {
    if (feed === undefined) delete process.env.NEXT_PUBLIC_FOSTERFOLIO_FEED;
    else process.env.NEXT_PUBLIC_FOSTERFOLIO_FEED = feed;
    if (search === undefined) delete process.env.NEXT_PUBLIC_FOSTERFOLIO_SEARCH;
    else process.env.NEXT_PUBLIC_FOSTERFOLIO_SEARCH = search;
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
    expect(isFosterfolioFeedEnabled()).toBe(true);
    expect(isFosterfolioSearchEnabled()).toBe(false);
  });
});
