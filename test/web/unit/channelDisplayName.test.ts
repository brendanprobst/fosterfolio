import { channelDisplayName } from "@client/features/petInsights/present";
import { describe, expect, it } from "vitest";

const channels = [
  { key: "instagram", name: "Instagram", isPreset: true },
  { key: "vet-office", name: "Vet Office", isPreset: false },
];

describe("channelDisplayName", () => {
  it("names the system channels instead of showing the raw key", () => {
    expect(channelDisplayName("direct", channels)).toBe("Direct / original QR");
    expect(channelDisplayName("search", channels)).toBe("Search");
    expect(channelDisplayName("default", channels)).toBe("Default link");
  });

  it("prefers the link's channel name, then the picker name", () => {
    expect(
      channelDisplayName("vet-office", channels, [{ channelKey: "vet-office", channelName: "Vet office!" }]),
    ).toBe("Vet office!");
    expect(channelDisplayName("vet-office", channels)).toBe("Vet Office");
    expect(channelDisplayName("instagram", channels)).toBe("Instagram");
  });

  it("falls back to the key for a channel it doesn't know", () => {
    expect(channelDisplayName("mystery", channels)).toBe("mystery");
    expect(channelDisplayName("constructor", channels)).toBe("constructor");
  });
});
