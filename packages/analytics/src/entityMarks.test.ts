import { consumeMarkFromUrl, hasEntityMark, markEntity } from "./entityMarks";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe("entity marks", () => {
  it("remembers an id and ignores a different one", () => {
    const storage = memoryStorage();
    markEntity("via_foster_me", "biscuit", storage);
    expect(hasEntityMark("via_foster_me", "biscuit", storage)).toBe(true);
    expect(hasEntityMark("via_foster_me", "mochi", storage)).toBe(false);
    markEntity("via_foster_me", "biscuit", storage);
    expect(JSON.parse(storage.getItem("ff_via_foster_me") ?? "[]")).toEqual(["biscuit"]);
  });

  it("marks from a matching query param and strips only that param", () => {
    const storage = memoryStorage();
    let replaced = "";
    const marked = consumeMarkFromUrl({
      param: "via",
      value: "foster-me",
      key: "via_foster_me",
      id: "biscuit",
      storage,
      location: {
        href: "https://example.test/@alex/pet/biscuit?via=foster-me&s=CODE",
        search: "?via=foster-me&s=CODE",
        pathname: "/@alex/pet/biscuit",
        hash: "",
      },
      history: {
        replaceState: (_data, _unused, url) => {
          replaced = String(url);
        },
      },
    });
    expect(marked).toBe(true);
    expect(hasEntityMark("via_foster_me", "biscuit", storage)).toBe(true);
    expect(replaced).toBe("/@alex/pet/biscuit?s=CODE");
  });

  it("leaves the address alone when the param does not match", () => {
    const storage = memoryStorage();
    let replaced = "";
    const marked = consumeMarkFromUrl({
      param: "via",
      value: "foster-me",
      key: "via_foster_me",
      id: "biscuit",
      storage,
      location: {
        href: "https://example.test/@alex/pet/biscuit",
        search: "",
        pathname: "/@alex/pet/biscuit",
        hash: "",
      },
      history: {
        replaceState: (_data, _unused, url) => {
          replaced = String(url);
        },
      },
    });
    expect(marked).toBe(false);
    expect(replaced).toBe("");
    expect(hasEntityMark("via_foster_me", "biscuit", storage)).toBe(false);
  });
});
