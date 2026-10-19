import { petHrefFromFosterMe } from "@client/lib/petBioPath";
import { capturePetEvent } from "@client/lib/analytics/initFosterfolioAnalytics";
import { consumeMarkFromUrl, hasEntityMark, markEntity, track } from "@lattice/analytics";
import { vi } from "vitest";

vi.mock("@lattice/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lattice/analytics")>();
  return {
    ...actual,
    track: vi.fn(),
    ensureAttribution: vi.fn(async () => ({
      linkId: null,
      channelKey: "direct",
      referrerDomain: null,
      targetId: null,
    })),
  };
});

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe("via foster-me marks", () => {
  it("builds the preview card href with the one-shot param", () => {
    expect(petHrefFromFosterMe("alex", "biscuit")).toBe("/@alex/pet/biscuit?via=foster-me");
  });

  it("consumes the param, keeps the mark across a later read, and does not mark another pet", () => {
    const storage = memoryStorage();
    let address = "/@alex/pet/biscuit?via=foster-me";
    const marked = consumeMarkFromUrl({
      param: "via",
      value: "foster-me",
      key: "via_foster_me",
      id: "biscuit",
      storage,
      location: {
        href: `https://example.test${address}`,
        search: "?via=foster-me",
        pathname: "/@alex/pet/biscuit",
        hash: "",
      },
      history: {
        replaceState: (_data, _unused, url) => {
          address = String(url);
        },
      },
    });

    expect(marked).toBe(true);
    expect(address).toBe("/@alex/pet/biscuit");
    expect(hasEntityMark("via_foster_me", "biscuit", storage)).toBe(true);
    expect(hasEntityMark("via_foster_me", "mochi", storage)).toBe(false);
    markEntity("via_foster_me", "biscuit", storage);
    expect(hasEntityMark("via_foster_me", "biscuit", storage)).toBe(true);
  });

  it("sends via_foster_me on pet events only for the marked pet", async () => {
    sessionStorage.clear();
    vi.mocked(track).mockClear();
    consumeMarkFromUrl({
      param: "via",
      value: "foster-me",
      key: "via_foster_me",
      id: "biscuit",
      storage: sessionStorage,
      location: {
        href: "https://example.test/@alex/pet/biscuit?via=foster-me",
        search: "?via=foster-me",
        pathname: "/@alex/pet/biscuit",
        hash: "",
      },
      history: { replaceState: () => undefined },
    });

    await capturePetEvent("pet_viewed", { id: "biscuit", ownerId: "owner-1" });
    await capturePetEvent("inquiry_form_opened", { id: "mochi", ownerId: "owner-1" });

    expect(track).toHaveBeenNthCalledWith(
      1,
      "pet_viewed",
      expect.objectContaining({ pet_id: "biscuit", via_foster_me: true }),
    );
    expect(track).toHaveBeenNthCalledWith(
      2,
      "inquiry_form_opened",
      expect.objectContaining({ pet_id: "mochi", via_foster_me: false }),
    );
  });
});
