import { resolveFirstTouch, readStoredAttribution } from "./firstTouch";
import { channelKeyFromHostname } from "./referrer";

describe("first-touch attribution", () => {
  it("maps the referrer list and treats everything else as direct", () => {
    expect(channelKeyFromHostname("instagram.com")).toBe("instagram");
    expect(channelKeyFromHostname("www.instagram.com")).toBe("instagram");
    expect(channelKeyFromHostname("facebook.com")).toBe("facebook");
    expect(channelKeyFromHostname("l.facebook.com")).toBe("facebook");
    expect(channelKeyFromHostname("www.facebook.com")).toBe("facebook");
    expect(channelKeyFromHostname("tiktok.com")).toBe("tiktok");
    expect(channelKeyFromHostname("www.google.com")).toBe("search");
    expect(channelKeyFromHostname("google.co.uk")).toBe("search");
    expect(channelKeyFromHostname("maps.google.com")).toBe("search");
    expect(channelKeyFromHostname("google.com.au")).toBe("search");
    expect(channelKeyFromHostname("google.evil.com")).toBe("direct");
    expect(channelKeyFromHostname("example.com")).toBe("direct");
    expect(channelKeyFromHostname("")).toBe("direct");
  });

  it("keeps an existing session and never overwrites it", () => {
    const existing = {
      linkId: "link-1",
      channelKey: "lawn_sign",
      referrerDomain: "instagram.com",
      targetId: "pet-1",
    };
    expect(
      resolveFirstTouch({
        existing,
        queryCode: "OTHER",
        referrer: "https://www.google.com/search?q=dogs",
        resolvedLink: { linkId: "link-2", channelKey: "flyer", targetId: "pet-2" },
      }),
    ).toBe(existing);
  });

  it("uses a resolved query code before the referrer", () => {
    expect(
      resolveFirstTouch({
        existing: null,
        queryCode: "Ab12cd",
        referrer: "https://www.instagram.com/p/abc",
        resolvedLink: { linkId: "link-9", channelKey: "lawn_sign", targetId: "pet-9" },
      }),
    ).toEqual({
      linkId: "link-9",
      channelKey: "lawn_sign",
      referrerDomain: "www.instagram.com",
      targetId: "pet-9",
    });
  });

  it("falls through to the referrer when the code does not resolve", () => {
    expect(
      resolveFirstTouch({
        existing: null,
        queryCode: "missing",
        referrer: "https://l.facebook.com/l.php",
        resolvedLink: null,
      }),
    ).toEqual({
      linkId: null,
      channelKey: "facebook",
      referrerDomain: "l.facebook.com",
      targetId: null,
    });
  });

  it("uses direct when the referrer is missing or unknown", () => {
    expect(
      resolveFirstTouch({
        existing: null,
        queryCode: null,
        referrer: null,
        resolvedLink: null,
      }),
    ).toEqual({
      linkId: null,
      channelKey: "direct",
      referrerDomain: null,
      targetId: null,
    });

    expect(
      resolveFirstTouch({
        existing: null,
        queryCode: " ",
        referrer: "https://news.example/story",
        resolvedLink: null,
      }),
    ).toEqual({
      linkId: null,
      channelKey: "direct",
      referrerDomain: "news.example",
      targetId: null,
    });
  });

  it("reads a stored source and ignores a broken payload", () => {
    const storage = {
      getItem: (key: string) =>
        key === "ff_source"
          ? JSON.stringify({
              linkId: null,
              channelKey: "direct",
              referrerDomain: null,
              targetId: null,
            })
          : "not-json",
    };
    expect(readStoredAttribution(storage, "ff_source")?.channelKey).toBe("direct");
    expect(readStoredAttribution(storage, "other")).toBeNull();
  });
});
